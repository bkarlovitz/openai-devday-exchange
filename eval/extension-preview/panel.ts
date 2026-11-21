import { Run } from "@council/contracts";
import { Schema } from "effect";
import sampleRun from "../../.viktor/examples/extracted-run.json";

const run = Schema.decodeUnknownSync(Run)(sampleRun);
const progress = document.querySelector<HTMLParagraphElement>("#progress")!;
const claims = document.querySelector<HTMLOListElement>("#claims")!;

progress.textContent = `Sample run · ${run.claims?.length ?? 0} extracted claims`;
for (const claim of run.claims ?? []) {
  const item = document.createElement("li");
  const assertion = document.createElement("h2");
  assertion.textContent = claim.assertion;
  const quote = document.createElement("blockquote");
  quote.textContent = claim.quote;
  const status = document.createElement("p");
  status.textContent = claim.status === "awaiting_research" ? "Awaiting evidence" : claim.status;
  item.append(assertion, quote, status);
  claims.append(item);
}
