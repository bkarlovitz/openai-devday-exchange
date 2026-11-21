import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect, Schema } from "effect";
import { ClaimDetail } from "@council/contracts";
import type { Env } from "../env";
import { coordinator } from "../services/run-store";
import { translateExplanation } from "../services/explanation-language";

export interface TranslationParams {
  runId: string;
  claimId: string;
  language: "en" | "es" | "ca";
  languageRevision: number;
  sourceArtifactKey: string;
}

export class TranslateClaim extends WorkflowEntrypoint<Env, TranslationParams> {
  async run(event: WorkflowEvent<TranslationParams>, step: WorkflowStep) {
    const { runId, claimId, language, languageRevision, sourceArtifactKey } = event.payload;
    const owner = coordinator(this.env, runId);
    const artifactKey = `runs/${runId}/translations/${claimId}/${languageRevision}/${language}.json`;
    const options = {
      retries: { limit: 0, delay: "1 second" as const },
      timeout: "40 seconds" as const,
    };
    try {
      const accepted = await step.do("begin-translation", options, () =>
        owner.beginTranslation(languageRevision, claimId, language, sourceArtifactKey),
      );
      if (!accepted) return { runId, claimId, status: "skipped" };
      await step.do("translate-explanation", options, async () => {
        if (await this.env.SUBMISSIONS.head(artifactKey)) return artifactKey;
        const source = await this.env.SUBMISSIONS.get(sourceArtifactKey);
        if (!source) throw new Error("Retained assessment artifact is missing.");
        const detail = Schema.decodeUnknownSync(ClaimDetail)(await source.json());
        if (detail.claim.claimId !== claimId)
          throw new Error("Retained assessment belongs to a different claim.");
        const translated = await Effect.runPromise(
          translateExplanation(this.env, detail, language),
        );
        await this.env.SUBMISSIONS.put(artifactKey, JSON.stringify(translated), {
          httpMetadata: { contentType: "application/json" },
        });
        return artifactKey;
      });
      await step.do("publish-translation", options, () =>
        owner.publishTranslation(
          languageRevision,
          claimId,
          language,
          sourceArtifactKey,
          artifactKey,
        ),
      );
      return { runId, claimId, status: "complete" };
    } catch (error) {
      await owner.failTranslation(
        languageRevision,
        claimId,
        language,
        sourceArtifactKey,
        error instanceof Error ? error.message : "Explanation translation failed.",
      );
      throw error;
    }
  }
}
