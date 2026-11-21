import { Atom } from "@effect-atom/atom-react";
import type { Run } from "@council/contracts";

export type RunState =
  | { status: "loading" }
  | { status: "loaded"; run: Run }
  | { status: "error"; error: string };

export const runState = Atom.family((_runId: string) => Atom.make<RunState>({ status: "loading" }));

export function needsExtractionPolling(run: Run) {
  return run.status === "queued" || run.status === "extracting";
}
