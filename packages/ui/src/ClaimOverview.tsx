import type { Claim } from "@council/contracts";
export function ClaimOverview({ claims }: { claims: readonly Claim[] }) {
  const supported = claims.filter((c) => c.verdict === "supported").length;
  const mixed = claims.filter((c) => c.verdict === "mixed_evidence").length;
  const insufficient = claims.filter((c) => c.verdict === "insufficient_evidence").length;
  const contradicted = claims.filter((c) => c.verdict === "contradicted").length;
  const checking = claims.filter((c) =>
    ["awaiting_research", "researching", "assessing"].includes(c.status),
  ).length;
  const done = supported + mixed + insufficient + contradicted;
  return (
    <section className="claim-overview" aria-label="Claim summary">
      <div className="summary-track" aria-hidden="true">
        {[
          ["supported", supported],
          ["mixed_evidence", mixed],
          ["insufficient_evidence", insufficient],
          ["contradicted", contradicted],
        ].map(([kind, count]) => (
          <span
            key={kind}
            className={String(kind)}
            style={{ width: `${done ? (Number(count) / done) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="counts">
        <span className="count-supported">
          ✓ <b>{supported}</b> supported
        </span>
        <span className="count-uncertain">
          ± <b>{mixed}</b> mixed
        </span>
        <span className="count-uncertain">
          ? <b>{insufficient}</b> insufficient
        </span>
        <span className="count-contradicted">
          × <b>{contradicted}</b> contradicted
        </span>
        <span className="count-checking">
          ● <b>{checking}</b> checking
        </span>
      </div>
    </section>
  );
}
