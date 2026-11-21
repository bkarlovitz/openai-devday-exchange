export function CheckabilityNotice({
  checkability,
}: {
  checkability?: {
    kind: "factual_assertion" | "opinion_prediction" | "uncertain";
    explanation: string;
  };
}) {
  if (!checkability) return null;
  const labels = {
    factual_assertion: "Factual assertion",
    opinion_prediction: "Opinion or prediction",
    uncertain: "Needs context",
  };
  return (
    <aside className="notice checkability-notice" role="status">
      <strong>Statement type · {labels[checkability.kind]}</strong>
      <p>{checkability.explanation}</p>
    </aside>
  );
}
