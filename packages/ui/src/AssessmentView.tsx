import type { Assessment, Verdict } from "@council/contracts";

export const verdictLabels: Record<Verdict, string> = {
  supported: "Supported",
  contradicted: "Contradicted",
  mixed_evidence: "Mixed evidence",
  insufficient_evidence: "Insufficient evidence",
};

export const verdictPhrases: Record<Verdict, string> = {
  supported: "Checks out.",
  contradicted: "Spectacular miss.",
  mixed_evidence: "Jury’s still out.",
  insufficient_evidence: "Jury’s still out.",
};

export function AssessmentView({ assessment }: { assessment: Assessment }) {
  return (
    <section className="assessment" aria-label="Assessment">
      <span className={`verdict verdict-${assessment.verdict}`}>
        {verdictLabels[assessment.verdict]}
      </span>
      <p className="assessment-ruling">{verdictPhrases[assessment.verdict]}</p>
      <p className="assessment-explanation">{assessment.explanation}</p>
      {assessment.uncertainty.length ? (
        <div className="uncertainty">
          <h4>Limits and uncertainty</h4>
          <ul>
            {assessment.uncertainty.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {assessment.calculations.map((calculation, index) => (
        <details className="calculation" key={index}>
          <summary>
            Calculation ·{" "}
            {calculation.result.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
            {calculation.unit}
          </summary>
          <p className="formula">
            {calculation.formula} = {calculation.result}
          </p>
          <ul>
            {calculation.operands.map((operand, operandIndex) => (
              <li key={operandIndex}>
                {operand.label} · {operand.value} {operand.unit} ·{" "}
                <a href={`#evidence-${encodeURIComponent(operand.evidenceId)}`}>Source</a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
