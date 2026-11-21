import { DurableObject } from "cloudflare:workers";
import { ClaimDetail } from "@council/contracts";
import type { Claim, Run, Submission } from "@council/contracts";
import { Schema } from "effect";
import type { Env, CheckRunParams } from "../env";
import type { TranslationParams } from "../workflows/translate-claim";
import { claimSignature, mergeOccurrences } from "../services/claim-occurrences";
import { claimIsTerminal, deriveProgress } from "../services/run-progress";

const Explanation = Schema.Struct({
  explanation: Schema.String,
  uncertainty: Schema.Array(Schema.String),
});
type TranslationReference = { sourceKey: string; artifactKey: string };
type PendingJob =
  | { kind: "check"; params: CheckRunParams }
  | { kind: "translate"; params: TranslationParams };
type CommandResult =
  | { status: 202; runId: string; commandId: string }
  | { status: 404 | 409; error: string };
type SavedCommand = { identity: string; result: CommandResult };
type Language = "en" | "es" | "ca";
type StoredRun = Omit<Run, "claims">;
type SubmitResult = { conflict: true } | { conflict: false; run: Run };

export class RunCoordinator extends DurableObject<Env> {
  async submit(submission: Submission): Promise<SubmitResult> {
    return this.ctx.blockConcurrencyWhile(async () => {
      let run = await this.ctx.storage.get<StoredRun>("run");
      if (run && JSON.stringify(run.submission) !== JSON.stringify(submission))
        return { conflict: true };
      if (!run) {
        run = {
          runId: submission.submissionKey,
          submission,
          status: "queued",
          createdAt: new Date().toISOString(),
          revision: 0,
          errorCount: 0,
        };
      }
      if (!run.extraction) {
        run = {
          ...run,
          status: "queued",
          extraction: {
            attemptId: `${run.runId}-extract-1`,
            completedChunks: 0,
            totalChunks: 0,
            done: false,
          },
        };
      }
      const pipelineVersion = await this.ctx.storage.get<number>("pipeline-version");
      if (!pipelineVersion && run.extraction?.done && run.status === "processing") {
        run = {
          ...run,
          status: "queued",
          extraction: {
            ...run.extraction,
            attemptId: `${run.runId}-check-1`,
          },
        };
      }
      await this.ctx.storage.put("pipeline-version", 2);
      await this.ctx.storage.put("run", run);
      if (run.status === "queued") {
        await this.ctx.storage.setAlarm(Date.now() + 10_000);
        await this.launch(run);
      }
      return { conflict: false, run: { ...run, claims: [] } };
    });
  }

  async getRun(): Promise<Run | null> {
    const run = await this.ctx.storage.get<StoredRun>("run");
    if (!run) return null;
    const claims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
    return {
      ...run,
      claims: [...claims.values()].sort(
        (a, b) => a.start - b.start || a.claimId.localeCompare(b.claimId),
      ),
    };
  }

  async beginExtraction(attemptId: string, totalChunks: number): Promise<void> {
    await this.updateAttempt(attemptId, (run) => ({
      ...run,
      status: "extracting",
      extraction: { ...run.extraction!, totalChunks },
    }));
  }

  async publishCheckability(
    attemptId: string,
    checkability: NonNullable<Run["checkability"]>,
  ): Promise<void> {
    await this.updateAttempt(attemptId, (run) => ({ ...run, checkability }));
  }

  async publishChunk(
    attemptId: string,
    index: number,
    language: "en" | "es" | "ca",
    claims: Claim[],
    warnings: string[] = [],
  ): Promise<Claim[]> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run || run.extraction?.attemptId !== attemptId)
        throw new Error("Stale extraction attempt.");
      const published = `published/${attemptId}/${index}`;
      const prior = await this.ctx.storage.get<{ accepted: Claim[] } | boolean>(published);
      if (prior) return typeof prior === "object" ? prior.accepted : claims;
      const accepted: Claim[] = [];
      for (const claim of claims) {
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(claimSignature(claim)),
        );
        const fingerprint = [...new Uint8Array(digest)]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
        const canonicalKey = `canonical/${fingerprint}`;
        const canonicalId = await this.ctx.storage.get<string>(canonicalKey);
        const existing = await this.ctx.storage.get<Claim>(`claim/${canonicalId ?? claim.claimId}`);
        if (existing) {
          await this.ctx.storage.put(
            `claim/${existing.claimId}`,
            mergeOccurrences(existing, claim),
          );
        } else {
          accepted.push(claim);
          await this.ctx.storage.put({
            [`claim/${claim.claimId}`]: claim,
            [canonicalKey]: claim.claimId,
          });
        }
      }
      await this.ctx.storage.put(published, { accepted });
      const currentClaims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
      await this.ctx.storage.put(
        "run",
        deriveProgress(
          {
            ...run,
            detectedLanguage: run.detectedLanguage ?? language,
            explanationLanguage:
              run.explanationLanguage ??
              run.submission.explanationLanguage ??
              run.detectedLanguage ??
              language,
            extraction: {
              ...run.extraction,
              warnings: [
                ...(run.extraction.warnings ?? []),
                ...warnings.map((warning) => `Section ${index + 1}: ${warning}`),
              ],
              completedChunks: Math.max(run.extraction.completedChunks, index + 1),
            },
            revision: run.revision + 1,
          },
          [...currentClaims.values()],
        ),
      );
      return accepted;
    });
  }

  async finishExtraction(attemptId: string): Promise<void> {
    await this.updateAttempt(attemptId, (run) => ({
      ...run,
      extraction: { ...run.extraction!, done: true },
    }));
  }

  async failExtraction(attemptId: string, error: string): Promise<void> {
    await this.updateAttempt(attemptId, (run) => ({ ...run, status: "error", error }));
  }

  async finishFailedRun(attemptId: string, error: string, selectedIds?: string[]): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run) throw new Error("Submission not found.");
      const stored = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
      for (const claim of stored.values()) {
        const authorized = await this.ctx.storage.get<string>(`research-attempt/${claim.claimId}`);
        if (
          !claimIsTerminal(claim) &&
          (!selectedIds || selectedIds.includes(claim.claimId)) &&
          (authorized === attemptId || (!authorized && run.extraction?.attemptId === attemptId))
        ) {
          await this.ctx.storage.put(`claim/${claim.claimId}`, {
            ...claim,
            status: "error",
            error,
          });
        }
      }
      const extractionFailure =
        !selectedIds && run.extraction?.attemptId === attemptId && !run.extraction.done;
      await this.storeRun({
        ...run,
        ...(extractionFailure ? { error } : {}),
        revision: run.revision + 1,
      });
    });
  }

  async getClaimJson(claimId: string): Promise<string | null> {
    const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
    if (!claim) return null;
    const reference = await this.ctx.storage.get<string>(`detail/${claimId}`);
    if (!reference) return JSON.stringify({ claim, evidence: [] });
    const artifact = await this.env.SUBMISSIONS.get(reference);
    if (!artifact) throw new Error("Claim detail artifact is missing.");
    const detail = Schema.decodeUnknownSync(ClaimDetail)(await artifact.json());
    const run = await this.ctx.storage.get<StoredRun>("run");
    const language = run?.explanationLanguage;
    const translated = language
      ? await this.ctx.storage.get<TranslationReference>(`translated/${claimId}/${language}`)
      : undefined;
    if (detail.assessment && translated?.sourceKey === reference) {
      const translatedObject = await this.env.SUBMISSIONS.get(translated.artifactKey);
      if (!translatedObject) throw new Error("Translated explanation is missing.");
      const explanation = Schema.decodeUnknownSync(Explanation)(await translatedObject.json());
      return JSON.stringify({
        ...detail,
        claim: { ...claim, explanationLanguage: language },
        assessment: { ...detail.assessment, ...explanation },
      });
    }
    return JSON.stringify({ ...detail, claim });
  }

  async beginResearch(attemptId: string, claimId: string): Promise<boolean> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      const authorized = await this.ctx.storage.get<string>(`research-attempt/${claimId}`);
      if (
        !run ||
        !claim ||
        (authorized ? authorized !== attemptId : run.extraction?.attemptId !== attemptId)
      )
        throw new Error("Stale research attempt.");
      if (claimIsTerminal(claim)) return false;
      await this.ctx.storage.put({
        [`claim/${claimId}`]: { ...claim, status: "researching", error: undefined },
        [`research-attempt/${claimId}`]: attemptId,
      });
      await this.storeRun({ ...run, revision: run.revision + 1 });
      return true;
    });
  }

  async publishClaim(attemptId: string, claimId: string, artifactKey: string): Promise<void> {
    const artifact = await this.env.SUBMISSIONS.get(artifactKey);
    if (!artifact) throw new Error("Research artifact is missing.");
    const detail = Schema.decodeUnknownSync(ClaimDetail)(await artifact.json());
    if (detail.claim.claimId !== claimId) throw new Error("Mismatched claim artifact.");
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      const current = await this.ctx.storage.get<string>(`research-attempt/${claimId}`);
      if (!run || current !== attemptId) {
        throw new Error("Stale claim publication.");
      }
      const currentClaim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      let claim: Claim = {
        ...detail.claim,
        occurrences: currentClaim?.occurrences ?? detail.claim.occurrences,
        evidenceCount: detail.evidence.length,
        verdict: detail.assessment?.verdict,
      };
      if (detail.assessment && claim.status === "complete") {
        await this.ctx.storage.put(
          `source-language/${claimId}`,
          claim.explanationLanguage ?? run.explanationLanguage ?? run.detectedLanguage ?? "en",
        );
        await this.ctx.storage.put(`source-language-verified/${claimId}`, true);
        claim = await this.prepareTranslation(run, claim, artifactKey);
      }
      await this.ctx.storage.put({
        [`claim/${claimId}`]: claim,
        [`detail/${claimId}`]: artifactKey,
      });
      await this.storeRun({ ...run, revision: run.revision + 1 });
    });
    await this.launchPendingJobs();
  }

  async finishResearch(attemptId: string, _selectedIds?: string[]): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      const job = await this.ctx.storage.get<PendingJob>(`job/${attemptId}`);
      if (!run || (run.extraction?.attemptId !== attemptId && job?.kind !== "check"))
        throw new Error("Stale research attempt.");
      await this.storeRun({ ...run, revision: run.revision + 1 });
    });
  }

  async alarm(): Promise<void> {
    const run = await this.ctx.storage.get<StoredRun>("run");
    if (run?.status === "queued") await this.launch(run);
    await this.launchPendingJobs();
  }

  async requestRetry(commandId: string, claimId?: string): Promise<CommandResult> {
    const identity = JSON.stringify(["retry", claimId ?? null]);
    const result = await this.ctx.blockConcurrencyWhile(async (): Promise<CommandResult> => {
      const previous = await this.ctx.storage.get<SavedCommand>(`command/${commandId}`);
      if (previous)
        return previous.identity === identity
          ? previous.result
          : { status: 409, error: "This command ID was already used for another action." };
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run) return { status: 404, error: "Submission not found." };
      const claims = [...(await this.ctx.storage.list<Claim>({ prefix: "claim/" })).values()];
      if (claimId && !claims.some((claim) => claim.claimId === claimId))
        return { status: 404, error: "Claim not found." };
      const failed = claims.filter(
        (claim) => claim.status === "error" && (!claimId || claim.claimId === claimId),
      );
      const retryExtraction = !claimId && !!run.error && run.extraction?.done === false;
      if (!failed.length && !retryExtraction)
        return { status: 409, error: "There are no failed stages to retry." };
      let next = { ...run, revision: run.revision + 1 };
      if (retryExtraction) {
        const attemptId = `${run.runId}-extract-${commandId}`;
        await this.queueJob(attemptId, {
          kind: "check",
          params: { runId: run.runId, reuseExtractionAttemptId: run.extraction!.attemptId },
        });
        next = {
          ...next,
          error: undefined,
          extraction: {
            ...run.extraction!,
            attemptId,
            completedChunks: 0,
            done: false,
            warnings: [],
          },
        };
      }
      if (failed.length) {
        const attemptId = `${run.runId}-retry-${commandId}`;
        for (const claim of failed)
          await this.ctx.storage.put({
            [`claim/${claim.claimId}`]: {
              ...claim,
              status: "awaiting_research",
              error: undefined,
              verdict: undefined,
              translationStatus: undefined,
              translationError: undefined,
            },
            [`research-attempt/${claim.claimId}`]: attemptId,
          });
        await this.queueJob(attemptId, {
          kind: "check",
          params: {
            runId: run.runId,
            resumeResearch: true,
            claimIds: failed.map((claim) => claim.claimId),
          },
        });
      }
      const receipt = { status: 202 as const, runId: run.runId, commandId };
      await this.ctx.storage.put(`command/${commandId}`, { identity, result: receipt });
      await this.storeRun(next);
      return receipt;
    });
    if (result.status === 202) await this.launchPendingJobs();
    return result;
  }

  async requestLanguage(commandId: string, language: Language): Promise<CommandResult> {
    const identity = JSON.stringify(["language", language]);
    const result = await this.ctx.blockConcurrencyWhile(async (): Promise<CommandResult> => {
      const previous = await this.ctx.storage.get<SavedCommand>(`command/${commandId}`);
      if (previous)
        return previous.identity === identity
          ? previous.result
          : { status: 409, error: "This command ID was already used for another action." };
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run) return { status: 404, error: "Submission not found." };
      const next: StoredRun = {
        ...run,
        explanationLanguage: language,
        languageRevision: (run.languageRevision ?? 0) + 1,
        revision: run.revision + 1,
        translation: { language, status: "processing", pendingCount: 0, errorCount: 0 },
      };
      const claims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
      for (const claim of claims.values()) {
        if (claim.status !== "complete") continue;
        const sourceKey = await this.ctx.storage.get<string>(`detail/${claim.claimId}`);
        if (!sourceKey) continue;
        if (!(await this.ctx.storage.get(`source-language/${claim.claimId}`))) {
          await this.ctx.storage.put(
            `source-language/${claim.claimId}`,
            claim.explanationLanguage ?? run.explanationLanguage ?? run.detectedLanguage ?? "en",
          );
        }
        await this.ctx.storage.put(
          `claim/${claim.claimId}`,
          await this.prepareTranslation(next, claim, sourceKey),
        );
      }
      const receipt = { status: 202 as const, runId: run.runId, commandId };
      await this.ctx.storage.put(`command/${commandId}`, { identity, result: receipt });
      await this.storeRun(next);
      return receipt;
    });
    if (result.status === 202) await this.launchPendingJobs();
    return result;
  }

  async beginTranslation(
    revision: number,
    claimId: string,
    language: Language,
    sourceKey: string,
  ): Promise<boolean> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.translationOwner(revision, claimId, language, sourceKey);
      if (!run) return false;
      const cached = await this.ctx.storage.get<TranslationReference>(
        `translated/${claimId}/${language}`,
      );
      if (cached?.sourceKey === sourceKey) return false;
      const sourceLanguage = await this.ctx.storage.get<Language>(`source-language/${claimId}`);
      if (
        sourceLanguage === language &&
        (await this.ctx.storage.get<boolean>(`source-language-verified/${claimId}`))
      )
        return false;
      const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      if (!claim || claim.status !== "complete") return false;
      await this.ctx.storage.put(`claim/${claimId}`, {
        ...claim,
        translationStatus: "translating",
        translationError: undefined,
      });
      await this.storeRun({ ...run, revision: run.revision + 1 });
      return true;
    });
  }

  async publishTranslation(
    revision: number,
    claimId: string,
    language: Language,
    sourceKey: string,
    artifactKey: string,
  ): Promise<void> {
    const artifact = await this.env.SUBMISSIONS.get(artifactKey);
    if (!artifact) throw new Error("Translated explanation artifact is missing.");
    Schema.decodeUnknownSync(Explanation)(await artifact.json());
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.translationOwner(revision, claimId, language, sourceKey);
      if (!run) return;
      const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      if (!claim || claim.status !== "complete") return;
      await this.ctx.storage.put({
        [`translated/${claimId}/${language}`]: { sourceKey, artifactKey },
        [`claim/${claimId}`]: {
          ...claim,
          explanationLanguage: language,
          translationStatus: undefined,
          translationError: undefined,
        },
      });
      await this.storeRun({ ...run, revision: run.revision + 1 });
    });
  }

  async failTranslation(
    revision: number,
    claimId: string,
    language: Language,
    sourceKey: string,
    error: string,
  ): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.translationOwner(revision, claimId, language, sourceKey);
      const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      if (!run || !claim || claim.status !== "complete") return;
      await this.ctx.storage.put(`claim/${claimId}`, {
        ...claim,
        translationStatus: "error",
        translationError: error,
      });
      await this.storeRun({ ...run, revision: run.revision + 1 });
    });
  }

  private async translationOwner(
    revision: number,
    claimId: string,
    language: Language,
    sourceKey: string,
  ): Promise<StoredRun | undefined> {
    const run = await this.ctx.storage.get<StoredRun>("run");
    const currentKey = await this.ctx.storage.get<string>(`detail/${claimId}`);
    return run &&
      run.languageRevision === revision &&
      run.explanationLanguage === language &&
      currentKey === sourceKey
      ? run
      : undefined;
  }

  private async prepareTranslation(
    run: StoredRun,
    claim: Claim,
    sourceKey: string,
  ): Promise<Claim> {
    let verified = await this.ctx.storage.get<boolean>(`source-language-verified/${claim.claimId}`);
    if (verified === undefined) {
      const artifact = await this.env.SUBMISSIONS.get(sourceKey);
      const source = artifact
        ? Schema.decodeUnknownSync(ClaimDetail)(await artifact.json())
        : undefined;
      const declared = source?.claim.explanationLanguage;
      verified = declared !== undefined;
      if (declared) await this.ctx.storage.put(`source-language/${claim.claimId}`, declared);
      await this.ctx.storage.put(`source-language-verified/${claim.claimId}`, verified);
    }
    const sourceLanguage =
      (await this.ctx.storage.get<Language>(`source-language/${claim.claimId}`)) ??
      claim.explanationLanguage ??
      run.explanationLanguage ??
      run.detectedLanguage ??
      "en";
    const target = run.explanationLanguage ?? sourceLanguage;
    const cached = await this.ctx.storage.get<TranslationReference>(
      `translated/${claim.claimId}/${target}`,
    );
    if ((verified && sourceLanguage === target) || cached?.sourceKey === sourceKey) {
      return {
        ...claim,
        explanationLanguage: target,
        translationStatus: undefined,
        translationError: undefined,
      };
    }
    const revision = run.languageRevision ?? 0;
    const sourceHash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sourceKey))),
    ]
      .slice(0, 5)
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const suffix = claim.claimId.replace(`${run.runId}-`, "");
    await this.queueJob(`${run.runId}-lang-${revision}-${suffix}-${sourceHash}`, {
      kind: "translate",
      params: {
        runId: run.runId,
        claimId: claim.claimId,
        language: target,
        languageRevision: revision,
        sourceArtifactKey: sourceKey,
      },
    });
    return {
      ...claim,
      explanationLanguage: verified ? sourceLanguage : undefined,
      translationStatus: "queued",
      translationError: undefined,
    };
  }

  private async storeRun(run: StoredRun): Promise<void> {
    const claims = [...(await this.ctx.storage.list<Claim>({ prefix: "claim/" })).values()];
    let next = deriveProgress(run, claims);
    if (run.translation) {
      const pendingCount = claims.filter(
        (claim) =>
          claim.translationStatus === "queued" || claim.translationStatus === "translating",
      ).length;
      next = {
        ...next,
        translation: {
          ...run.translation,
          pendingCount,
          errorCount: claims.filter((claim) => claim.translationStatus === "error").length,
          status: pendingCount ? "processing" : "complete",
        },
      };
    }
    await this.ctx.storage.put("run", next);
  }

  private async queueJob(id: string, job: PendingJob): Promise<void> {
    await this.ctx.storage.put(`job/${id}`, job);
    await this.ctx.storage.setAlarm(Date.now() + 10_000);
  }

  private launchingJobs?: Promise<void>;
  private launchPendingJobs(): Promise<void> {
    if (this.launchingJobs) return this.launchingJobs;
    this.launchingJobs = this.launchJobs().finally(() => {
      this.launchingJobs = undefined;
    });
    return this.launchingJobs;
  }

  private async launchJobs(): Promise<void> {
    const jobs = await this.ctx.storage.list<PendingJob>({ prefix: "job/" });
    for (const [key, job] of jobs) {
      const id = key.slice(4);
      if (await this.ctx.storage.get(`started/${id}`)) continue;
      const workflow = job.kind === "check" ? this.env.CHECK_RUN : this.env.TRANSLATE_CLAIM;
      try {
        if (job.kind === "check") await this.env.CHECK_RUN.create({ id, params: job.params });
        else await this.env.TRANSLATE_CLAIM.create({ id, params: job.params });
      } catch (error) {
        const existing = await workflow.get(id);
        const status = await existing.status();
        if (status.status === "unknown") throw error;
      }
      await this.ctx.storage.put(`started/${id}`, true);
    }
  }

  private async updateAttempt(
    attemptId: string,
    change: (run: StoredRun) => StoredRun,
  ): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run || run.extraction?.attemptId !== attemptId)
        throw new Error("Stale extraction attempt.");
      const claims = [...(await this.ctx.storage.list<Claim>({ prefix: "claim/" })).values()];
      await this.ctx.storage.put(
        "run",
        deriveProgress({ ...change(run), revision: run.revision + 1 }, claims),
      );
    });
  }

  private async launch(run: StoredRun): Promise<void> {
    await this.env.SUBMISSIONS.put(
      `runs/${run.runId}/submission.json`,
      JSON.stringify(run.submission),
      {
        httpMetadata: { contentType: "application/json" },
      },
    );
    const attemptId = run.extraction!.attemptId;
    try {
      await this.env.CHECK_RUN.create({
        id: attemptId,
        params: { runId: run.runId, resumeResearch: run.extraction?.done === true },
      });
    } catch (error) {
      const existing = await this.env.CHECK_RUN.get(attemptId);
      const status = await existing.status();
      if (status.status === "unknown") throw error;
    }
  }
}
