import { DurableObject } from "cloudflare:workers";
import { ClaimDetail } from "@council/contracts";
import type { Claim, Run, Submission } from "@council/contracts";
import { Schema } from "effect";
import type { Env } from "../env";
import { claimSignature, mergeOccurrences } from "../services/claim-occurrences";
import { claimIsTerminal, deriveProgress } from "../services/run-progress";

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
    await this.ctx.storage.deleteAlarm();
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
        const existing = canonicalId
          ? await this.ctx.storage.get<Claim>(`claim/${canonicalId}`)
          : undefined;
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
              run.submission.explanationLanguage ?? run.detectedLanguage ?? language,
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

  async finishFailedRun(attemptId: string, error: string): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run || run.extraction?.attemptId !== attemptId)
        throw new Error("Stale processing attempt.");
      const stored = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
      const claims = [...stored.values()].map((claim) =>
        claimIsTerminal(claim) ? claim : { ...claim, status: "error" as const, error },
      );
      for (const claim of claims) await this.ctx.storage.put(`claim/${claim.claimId}`, claim);
      await this.ctx.storage.put(
        "run",
        deriveProgress({ ...run, error, revision: run.revision + 1 }, claims),
      );
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
    return JSON.stringify({ ...detail, claim });
  }

  async beginResearch(attemptId: string, claimId: string): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      const claim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      if (!run || run.extraction?.attemptId !== attemptId || !claim)
        throw new Error("Stale research attempt.");
      if (["complete", "error", "not_checkable"].includes(claim.status)) return;
      await this.ctx.storage.put({
        [`claim/${claimId}`]: { ...claim, status: "researching" },
        [`research-attempt/${claimId}`]: attemptId,
        run: { ...run, status: "processing", revision: run.revision + 1 },
      });
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
      if (!run || current !== attemptId || run.extraction?.attemptId !== attemptId) {
        throw new Error("Stale claim publication.");
      }
      const currentClaim = await this.ctx.storage.get<Claim>(`claim/${claimId}`);
      const claim: Claim = {
        ...detail.claim,
        occurrences: currentClaim?.occurrences ?? detail.claim.occurrences,
        evidenceCount: detail.evidence.length,
        verdict: detail.assessment?.verdict,
      };
      await this.ctx.storage.put({
        [`claim/${claimId}`]: claim,
        [`detail/${claimId}`]: artifactKey,
      });
      const claims = await this.ctx.storage.list<Claim>({ prefix: "claim/" });
      await this.ctx.storage.put(
        "run",
        deriveProgress({ ...run, revision: run.revision + 1 }, [...claims.values()]),
      );
    });
  }

  async finishResearch(attemptId: string): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const run = await this.ctx.storage.get<StoredRun>("run");
      if (!run || run.extraction?.attemptId !== attemptId)
        throw new Error("Stale research attempt.");
      const claims = [...(await this.ctx.storage.list<Claim>({ prefix: "claim/" })).values()];
      if ((!run.extraction.done && !run.error) || claims.some((claim) => !claimIsTerminal(claim))) {
        throw new Error("Research cannot finish while extraction or claims are pending.");
      }
      await this.ctx.storage.put(
        "run",
        deriveProgress({ ...run, revision: run.revision + 1 }, claims),
      );
    });
  }

  async alarm(): Promise<void> {
    const run = await this.ctx.storage.get<StoredRun>("run");
    if (run?.status === "queued") await this.launch(run);
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
      if (status.status === "unknown" || status.status === "errored") throw error;
    }
  }
}
