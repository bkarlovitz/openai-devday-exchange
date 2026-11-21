import { Effect } from "effect";
import { createApiClient } from "@council/contracts";
import type { Submission, SubmissionReceipt } from "@council/contracts";
import { API_ORIGIN } from "./config";
import { receiptKey } from "./messages";

export const api = createApiClient(API_ORIGIN);
const submissions = new Map<string, Promise<SubmissionReceipt>>();

export function submitOnce(submission: Submission) {
  const existing = submissions.get(submission.submissionKey);
  if (existing) return existing;
  const promise = Effect.runPromise(api.saveSubmission(submission))
    .then(async (receipt) => {
      await chrome.storage.local.set({ [receiptKey(submission.submissionKey)]: receipt });
      return receipt;
    })
    .finally(() => submissions.delete(submission.submissionKey));
  submissions.set(submission.submissionKey, promise);
  return promise;
}
