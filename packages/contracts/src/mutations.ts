import { Schema } from "effect";
import { Language } from "./languages";

export const RetryCommand = Schema.Struct({
  commandId: Schema.UUID,
  claimId: Schema.optional(Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9-]{1,100}$/))),
});
export type RetryCommand = typeof RetryCommand.Type;
export const LanguageCommand = Schema.Struct({ commandId: Schema.UUID, language: Language });
export type LanguageCommand = typeof LanguageCommand.Type;
export const MutationReceipt = Schema.Struct({ runId: Schema.UUID, commandId: Schema.UUID });
export type MutationReceipt = typeof MutationReceipt.Type;
