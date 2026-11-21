import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect, Schema } from "effect";
import { Assessment, ClaimDetail, ResearchResult, Submission } from "@council/contracts";
import type { Claim, Run } from "@council/contracts";
import type { Env } from "../env";
import { coordinator } from "../services/run-store";
import { chunkText } from "../services/chunk-text";
import { extractClaims } from "../services/extract-claims";
import { researchClaim } from "../research/research-claim";
import { assessClaim } from "../services/assess";
import { classifyPassage } from "../services/decisions";

export class CheckRun extends WorkflowEntrypoint<Env, { runId: string; resumeResearch?: boolean }> {
  async run(event: WorkflowEvent<{ runId: string; resumeResearch?: boolean }>, step: WorkflowStep) {
    const runId = event.payload.runId;
    const attemptId = event.instanceId;
    const owner = coordinator(this.env, runId);
    const lanes = [Promise.resolve(), Promise.resolve()];
    const laneErrors: unknown[] = [];
    let ordinal = 0;
    let extractionError: unknown;
    const enqueue = (
      run: Pick<Run, "runId" | "submission" | "explanationLanguage" | "detectedLanguage">,
      claims: readonly Claim[],
    ) => {
      for (const claim of claims) {
        const lane = ordinal++ % lanes.length;
        lanes[lane] = lanes[lane]
          .then(() => this.checkClaim(run, claim, claim.claimId, attemptId, step))
          .catch((error) => {
            laneErrors.push(error);
          });
      }
    };
    try {
      const object = await this.env.SUBMISSIONS.get(`runs/${runId}/submission.json`);
      if (!object) throw new Error("Saved submission is missing.");
      const submission = Schema.decodeUnknownSync(Submission)(await object.json());
      if (event.payload.resumeResearch) {
        const run = await owner.getRun();
        if (!run) throw new Error("Run disappeared before research.");
        enqueue(run, run.claims);
      } else {
        const chunks = chunkText(submission.text);
        let detectedLanguage: "en" | "es" | "ca" | undefined;
        await step.do("begin-extraction", () => owner.beginExtraction(attemptId, chunks.length));
        if (Array.from(submission.text).length <= 2000) {
          await step.do(
            "classify-passage",
            {
              retries: { limit: 0, delay: "1 second" },
              timeout: "20 seconds",
            },
            async () => {
              const checkability = await Effect.runPromise(
                classifyPassage(this.env, submission.text),
              ).catch(() => ({
                kind: "uncertain" as const,
                explanation:
                  "Checkability could not be determined. Claim extraction will still examine the passage.",
              }));
              await owner.publishCheckability(attemptId, checkability);
            },
          );
        }
        for (const chunk of chunks) {
          const key = `runs/${runId}/extraction/${attemptId}/${chunk.index}.json`;
          await step.do(
            `extract-${chunk.index}`,
            { retries: { limit: 0, delay: "1 second" }, timeout: "40 seconds" },
            async () => {
              if (await this.env.SUBMISSIONS.head(key)) return key;
              const result = await Effect.runPromise(
                extractClaims(this.env, chunk, submission, runId),
              );
              await this.env.SUBMISSIONS.put(key, JSON.stringify(result), {
                httpMetadata: { contentType: "application/json" },
              });
              return key;
            },
          );
          // The step output freezes scheduling inputs, including canonical IDs, for replay.
          const published = await step.do(`publish-${chunk.index}`, async () => {
            const artifact = await this.env.SUBMISSIONS.get(key);
            if (!artifact) throw new Error("Extraction artifact is missing.");
            const result = await artifact.json<{
              language: "en" | "es" | "ca";
              claims: Claim[];
              warnings?: string[];
            }>();
            const claims = await owner.publishChunk(
              attemptId,
              chunk.index,
              result.language,
              result.claims,
              result.warnings ?? [],
            );
            return { claims, language: result.language };
          });
          detectedLanguage ??= published.language;
          enqueue(
            {
              runId,
              submission,
              detectedLanguage,
              explanationLanguage: submission.explanationLanguage ?? detectedLanguage,
            },
            published.claims,
          );
        }
        await step.do("finish-extraction", () => owner.finishExtraction(attemptId));
      }
    } catch (error) {
      extractionError = error;
      await owner
        .failExtraction(attemptId, error instanceof Error ? error.message : "Extraction failed.")
        .catch((recordError) => {
          laneErrors.push(recordError);
        });
    }
    // Do not abandon already-published claims if a later extraction section fails.
    await Promise.all(lanes);
    const failure = extractionError ?? laneErrors[0];
    if (failure) {
      await owner.finishFailedRun(
        attemptId,
        failure instanceof Error ? failure.message : "Processing failed.",
      );
      throw failure;
    }
    await step.do("finish-research", () => owner.finishResearch(attemptId));
    return { runId, status: "complete" };
  }

  private async checkClaim(
    run: Pick<Run, "runId" | "submission" | "explanationLanguage" | "detectedLanguage">,
    claim: Claim,
    index: string,
    attemptId: string,
    step: WorkflowStep,
  ) {
    const owner = coordinator(this.env, run.runId);
    const prefix = `runs/${run.runId}/claims/${claim.claimId}/${attemptId}`;
    const researchKey = `${prefix}/research.json`;
    const detailKey = `${prefix}/detail.json`;
    try {
      await step.do(`begin-claim-${index}`, () => owner.beginResearch(attemptId, claim.claimId));
      await step.do(
        `research-${index}`,
        {
          retries: { limit: 0, delay: "1 second" },
          timeout: "3 minutes",
        },
        async () => {
          if (await this.env.SUBMISSIONS.head(researchKey)) return researchKey;
          const result = await Effect.runPromise(researchClaim(this.env, claim, run.submission));
          const research = Schema.decodeUnknownSync(ResearchResult)(result);
          await this.env.SUBMISSIONS.put(researchKey, JSON.stringify(research));
          return researchKey;
        },
      );
      const researchObject = await this.env.SUBMISSIONS.get(researchKey);
      if (!researchObject) throw new Error("Research checkpoint is missing.");
      const research = Schema.decodeUnknownSync(ResearchResult)(await researchObject.json());
      await step.do(`publish-evidence-${index}`, async () => {
        const detail: ClaimDetail = {
          claim: { ...claim, status: research.checkable ? "assessing" : "not_checkable" },
          evidence: research.evidence,
          research,
        };
        await this.env.SUBMISSIONS.put(`${prefix}/evidence.json`, JSON.stringify(detail));
        await owner.publishClaim(attemptId, claim.claimId, `${prefix}/evidence.json`);
      });
      if (!research.checkable) return;
      await step.do(
        `assess-${index}`,
        {
          retries: { limit: 0, delay: "1 second" },
          timeout: "75 seconds",
        },
        async () => {
          if (await this.env.SUBMISSIONS.head(detailKey)) return detailKey;
          const language = run.explanationLanguage ?? run.detectedLanguage ?? "en";
          const result = await Effect.runPromise(
            assessClaim(this.env, claim, research.evidence, language, research.decision),
          );
          const assessment = Schema.decodeUnknownSync(Assessment)(result);
          const detail: ClaimDetail = {
            claim: { ...claim, status: "complete", verdict: assessment.verdict },
            evidence: research.evidence,
            research,
            assessment,
          };
          await this.env.SUBMISSIONS.put(detailKey, JSON.stringify(detail));
          return detailKey;
        },
      );
      await step.do(`publish-assessment-${index}`, () =>
        owner.publishClaim(attemptId, claim.claimId, detailKey),
      );
    } catch (error) {
      await step.do(`claim-error-${index}`, async () => {
        const priorJson = await owner.getClaimJson(claim.claimId);
        const prior = priorJson
          ? Schema.decodeUnknownSync(ClaimDetail)(JSON.parse(priorJson))
          : null;
        const detail: ClaimDetail = {
          claim: {
            ...claim,
            status: "error",
            error: error instanceof Error ? error.message : "Research failed.",
          },
          evidence: prior?.evidence ?? [],
          research: prior?.research,
        };
        const key = `${prefix}/error.json`;
        await this.env.SUBMISSIONS.put(key, JSON.stringify(detail));
        await owner.publishClaim(attemptId, claim.claimId, key);
      });
    }
  }
}
