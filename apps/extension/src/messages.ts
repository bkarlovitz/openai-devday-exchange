import type { Submission, SubmissionReceipt } from "@council/contracts";

export const MENU_ID = "council-check-selection";
export const tabCheckKey = (tabId: number) => `tab-check:${tabId}`;
export const tabErrorKey = (tabId: number) => `tab-error:${tabId}`;
export const draftKey = (submissionKey: string) => `draft:${submissionKey}`;
export const receiptKey = (submissionKey: string) => `receipt:${submissionKey}`;

export interface StoredCheck {
  submission: Submission;
  receipt?: SubmissionReceipt;
}

export async function storeSelection(tabId: number, submission: Submission) {
  await chrome.storage.local.set({
    [draftKey(submission.submissionKey)]: submission,
    [tabCheckKey(tabId)]: submission.submissionKey,
    [tabErrorKey(tabId)]: null,
  });
}
