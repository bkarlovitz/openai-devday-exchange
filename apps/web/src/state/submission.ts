import { Atom } from "@effect-atom/atom-react";
import { Schema } from "effect";
import { Submission } from "@council/contracts";

function readDraft(): Submission {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem("council-draft") ?? "null");
    const decoded = Schema.decodeUnknownOption(Submission)(saved);
    if (decoded._tag === "Some") return decoded.value;
  } catch {
    // A disabled browser store still permits an in-memory submission.
  }
  return { submissionKey: crypto.randomUUID(), text: "" };
}

export function persistDraft(draft: Submission) {
  try {
    sessionStorage.setItem("council-draft", JSON.stringify(draft));
  } catch {
    // Keep the live draft usable when browser storage is unavailable.
  }
}

export const draftAtom = Atom.make(readDraft()).pipe(Atom.keepAlive);

export const saveStateAtom = Atom.make<{ pending: boolean; error?: string }>({
  pending: false,
});
