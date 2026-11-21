import { Effect, Schema } from "effect";
import type { Claim, Evidence, ResearchDecision } from "@council/contracts";
import type { Env } from "../env";

const Answer = Schema.Struct({
  type: Schema.String,
  name: Schema.String,
  probability: Schema.optional(Schema.Number),
  choice: Schema.optional(Schema.String),
});
const DecisionResponse = Schema.Struct({ answers: Schema.Array(Answer) });

type Question = {
  type: "predicate" | "choice";
  name: string;
  instructions: string;
  choices?: { value: string; description?: string }[];
};

function decide(env: Env, input: unknown, questions: Question[]) {
  return Effect.tryPromise({
    try: async () => {
      if (!env.OPENAI_API_KEY) throw new Error("Configure OPENAI_API_KEY for Decisions.");
      const response = await fetch("https://api.openai.com/v1/decisions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          model: env.DECISION_MODEL ?? "gpt-6-luna",
          input: JSON.stringify(input),
          questions,
        }),
      });
      if (!response.ok) throw new Error(`OpenAI Decisions failed (HTTP ${response.status}).`);
      const result = Schema.decodeUnknownSync(DecisionResponse)(await response.json());
      if (result.answers.some((answer) => answer.type === "refusal"))
        throw new Error("Decisions declined this classification.");
      return result.answers;
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error("Decisions failed.")),
  });
}

export function routeClaim(env: Env, claim: Claim) {
  return decide(env, { assertion: claim.assertion, quote: claim.quote, context: claim.context }, [
    {
      type: "choice",
      name: "checkable",
      instructions:
        "Classify the ASSERTION'S KIND, independently of whether it is true, plausible, contradicted, or agrees with the context. An incorrect factual statement is still a factual assertion. Classify only the supplied assertion; context is background.",
      choices: [
        {
          value: "factual_assertion",
          description:
            "Asserts a past or present fact that evidence could address, including false statements and incorrect numerical comparisons.",
        },
        {
          value: "opinion_prediction",
          description:
            "Pure preference, wish, recommendation or future prediction with no independently checkable past/present assertion.",
        },
        {
          value: "uncertain",
          description: "Ambiguous or insufficient detail; retain for research.",
        },
      ],
    },
    {
      type: "choice",
      name: "topic",
      instructions: "Which topic best describes the assertion?",
      choices: ["housing", "population", "tourism", "municipal", "general"].map((value) => ({
        value,
      })),
    },
    {
      type: "choice",
      name: "dataset",
      instructions:
        "Choose a source only if its actual measurements could address this claim. Choose web for policy decisions, events, or facts beyond these datasets.",
      choices: [
        {
          value: "incasol",
          description:
            "Barcelona/Catalonia registered housing rents in euros and contract counts, by municipality, year, quarter and published price band.",
        },
        {
          value: "population",
          description:
            "Barcelona registered population at January reference dates, with district/neighbourhood/census section.",
        },
        {
          value: "tourist-flats",
          description:
            "Published Barcelona tourist-flat register, dwelling records and capacity by district/neighbourhood. Current snapshot, no historical series.",
        },
        {
          value: "ine-59061",
          description:
            "Rental price indices and variations by series/year, with unit and scale codes. This is not average rent in euros.",
        },
        { value: "web", description: "General official documents and web research." },
      ],
    },
  ]).pipe(
    Effect.map((answers) => ({
      // Uncertain inputs continue to research rather than silently disappearing.
      checkable:
        answers.find((answer) => answer.name === "checkable")?.choice !== "opinion_prediction",
      topic: answers.find((answer) => answer.name === "topic")?.choice ?? "general",
      dataset: answers.find((answer) => answer.name === "dataset")?.choice ?? "web",
    })),
  );
}

export function judgeEvidence(env: Env, claim: Claim, evidence: readonly Evidence[]) {
  if (!evidence.length)
    return Effect.succeed<ResearchDecision>({
      relevant: false,
      sufficient: false,
      conflicting: false,
    });
  return decide(env, { assertion: claim.assertion, context: claim.context, evidence }, [
    {
      type: "predicate",
      name: "relevant",
      instructions:
        "Does retained evidence directly address at least one material part of the assertion? Check definitions, geography, period, and source scope.",
    },
    {
      type: "predicate",
      name: "sufficient",
      instructions:
        "Does retained evidence cover the material assertion sufficiently to assess support or contradiction? Require matching definitions, geography and time. An announcement does not establish completed delivery. A sample is insufficient for a full-population count unless an exact aggregate is present. Exact numerical operands with matching definitions and periods are sufficient when code can perform the comparison. Missing information means no.",
    },
    {
      type: "choice",
      name: "conflicting",
      instructions:
        "Classify whether the sources conflict with EACH OTHER about the same fact and scope. Values for different years, quarters, places, price bands or measures are different observations. A time-series change does not conflict. A source contradicting the claim does not by itself establish source conflict.",
      choices: [
        {
          value: "no_conflict",
          description:
            "Sources agree, complement each other, cover different scopes, or there is only one source.",
        },
        {
          value: "conflict",
          description:
            "At least two sources make incompatible assertions about exactly the same fact and scope.",
        },
        { value: "uncertain", description: "The relationship cannot be established." },
      ],
    },
  ]).pipe(
    Effect.map((answers) => {
      const probability = (name: string) =>
        answers.find((answer) => answer.name === name)?.probability ?? 0;
      return {
        relevant: probability("relevant") >= 0.5,
        sufficient: probability("sufficient") >= 0.8,
        conflicting:
          evidence.length > 1 &&
          answers.find((answer) => answer.name === "conflicting")?.choice === "conflict",
      };
    }),
  );
}
