import type { Evidence } from "@council/contracts";

export function EvidenceList({
  evidence,
  citedIds = [],
}: {
  evidence: readonly Evidence[];
  citedIds?: readonly string[];
}) {
  if (!evidence.length) return null;
  return (
    <section className="evidence-list" aria-label="Retrieved evidence">
      <h4>Evidence</h4>
      {evidence.map((item) => (
        <article className="evidence-item" id={`evidence-${item.evidenceId}`} key={item.evidenceId}>
          <div className="evidence-heading">
            <a
              href={
                item.pageNumber === undefined
                  ? item.sourceUrl
                  : `${item.sourceUrl.split("#")[0]}#page=${item.pageNumber}`
              }
              target="_blank"
              rel="noreferrer"
            >
              {item.title}
              {item.pageNumber !== undefined ? ` · page ${item.pageNumber}` : ""}
            </a>
            {citedIds.includes(item.evidenceId) ? (
              <span className="evidence-cited">Cited</span>
            ) : null}
          </div>
          {item.sourceDate ? <p className="muted">Source date {item.sourceDate}</p> : null}
          {item.kind === "dataset" ? (
            <p className="muted">
              {item.datasetId === "tourist-flats"
                ? "Published register snapshot"
                : "Observed periods"}
              {" · "}
              {[
                ...new Set(
                  (item.rows ?? [])
                    .map(({ data }) =>
                      [data.Data_Referencia, data.Any ?? data.Anyo, data["Període"]]
                        .filter((value) => value !== undefined)
                        .join(" "),
                    )
                    .filter(Boolean),
                ),
              ].join(", ") || "See the source record for coverage"}
            </p>
          ) : (
            <blockquote className="evidence-excerpt">{item.text}</blockquote>
          )}
          {item.aggregate ? (
            <p className="evidence-aggregate">
              {item.aggregate.status === "complete"
                ? `${item.aggregate.operation} across ${item.totalRows ?? "all matched"} rows · ${item.aggregate.value ?? "no numeric result"} ${["count", "count_distinct"].includes(item.aggregate.operation) ? "records" : (item.aggregate.unit ?? "")}`
                : "Some source values are missing, so an aggregate could not be established."}
            </p>
          ) : null}
          {item.rowsAreSample ? (
            <p className="muted">
              Showing {item.rows?.length ?? 0} of {item.totalRows ?? "the matched"} rows.
            </p>
          ) : null}
          <details>
            <summary>
              Source details{item.pageNumber !== undefined ? ` · page ${item.pageNumber}` : ""}
            </summary>
            <dl className="evidence-metadata">
              <dt>Retrieved</dt>
              <dd>{new Date(item.retrievedAt).toLocaleString()}</dd>
              {item.datasetId ? (
                <>
                  <dt>Dataset</dt>
                  <dd>{item.datasetId}</dd>
                </>
              ) : null}
              {item.snapshotId ? (
                <>
                  <dt>Snapshot</dt>
                  <dd>{item.snapshotId}</dd>
                </>
              ) : null}
              {item.resourceKey ? (
                <>
                  <dt>Resource</dt>
                  <dd>{item.resourceKey}</dd>
                </>
              ) : null}
              {item.sha256 ? (
                <>
                  <dt>SHA-256</dt>
                  <dd className="hash">{item.sha256}</dd>
                </>
              ) : null}
              {item.rowNumbers?.length ? (
                <>
                  <dt>Rows</dt>
                  <dd>{item.rowNumbers.join(", ")}</dd>
                </>
              ) : null}
            </dl>
            {item.kind === "dataset" ? <pre>{item.text}</pre> : null}
            {item.kind !== "dataset" && item.rows?.length ? (
              <>
                <h5>{item.rowsAreSample ? "Retrieved row preview" : "Retrieved rows"}</h5>
                <pre>{JSON.stringify(item.rows, null, 2)}</pre>
              </>
            ) : null}
            {item.kind !== "dataset" && item.query !== undefined ? (
              <>
                <h5>Query</h5>
                <pre>{JSON.stringify(item.query, null, 2)}</pre>
              </>
            ) : null}
          </details>
        </article>
      ))}
    </section>
  );
}
