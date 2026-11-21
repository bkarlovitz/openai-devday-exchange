import { Atom } from "@effect-atom/atom-react";
import type { ClaimDetail, Run } from "@council/contracts";

export const runState = Atom.family((_id: string) => Atom.make<{ run?: Run; error?: string }>({}));
export const claimState = Atom.family((_id: string) =>
  Atom.make<{ detail?: ClaimDetail; error?: string }>({}),
);
