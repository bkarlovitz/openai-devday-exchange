import { Atom } from "@effect-atom/atom-react";
import type { ClaimDetail, Run } from "@council/contracts";

export type RunState =
  | { status: "loading" }
  | { status: "loaded"; run: Run }
  | { status: "error"; error: string };

export const runState = Atom.family((_runId: string) => Atom.make<RunState>({ status: "loading" }));

export const claimDetailState = Atom.family((_key: string) =>
  Atom.make<{ detail?: ClaimDetail; error?: string }>({}),
);

export function needsRunPolling(run: Run) {
  return run.status === "queued" || run.status === "extracting" || run.status === "processing";
}
