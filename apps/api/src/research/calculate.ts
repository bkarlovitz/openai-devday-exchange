import type { Calculation, Evidence } from "@council/contracts";

type CalculationInput = Pick<Calculation, "operation" | "operands">;

function decimal(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
}

function sourceValues(evidence: Evidence, unit: string): number[] {
  const aggregate = evidence.aggregate;
  const aggregateUnit = ["count", "count_distinct"].includes(aggregate?.operation ?? "")
    ? "records"
    : aggregate?.unit;
  const aggregateValue =
    aggregate?.status === "complete" && aggregateUnit === unit
      ? decimal(aggregate.value)
      : undefined;
  const aggregates =
    evidence.kind === "dataset" && aggregateValue !== undefined ? [aggregateValue] : [];
  if (evidence.rows?.length) {
    let field: string | undefined;
    if (evidence.datasetId === "incasol") {
      if (unit === "EUR/month") field = "Renda";
      if (unit === "contracts") field = "Habitatges";
    } else if (evidence.datasetId === "population" && unit === "people") {
      field = "Valor";
    } else if (evidence.datasetId === "tourist-flats" && unit === "places") {
      field = "NUMERO_PLACES";
    } else if (evidence.datasetId === "ine-59061" && unit.startsWith("source-unit:")) {
      return evidence.rows
        .flatMap(({ data }) => {
          if (data.Secreto === true || unit !== `source-unit:${data.FK_Unidad}`) return [];
          const value = decimal(data.Valor);
          return value === undefined ? [] : [value];
        })
        .concat(aggregates);
    }
    if (!field) {
      if (aggregates.length) return aggregates;
      throw new Error("The calculation unit does not match the dataset measure.");
    }
    return evidence.rows
      .flatMap(({ data }) => {
        const value = decimal(data[field]);
        return value === undefined ? [] : [value];
      })
      .concat(aggregates);
  }
  if (evidence.kind === "dataset") return aggregates;
  return (evidence.text.match(/-?\d+(?:[.,]\d+)*/g) ?? [])
    .flatMap((token) => {
      const comma = token.lastIndexOf(",");
      const dot = token.lastIndexOf(".");
      if (comma >= 0 && dot >= 0) {
        const value =
          comma > dot ? token.replaceAll(".", "").replace(",", ".") : token.replaceAll(",", "");
        return [Number(value)].filter(Number.isFinite);
      }
      const separator = comma >= 0 ? "," : ".";
      const parts = token.split(separator);
      const candidates = [token.replace(",", ".")];
      if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3))
        candidates.push(parts.join(""));
      return candidates.map(Number).filter(Number.isFinite);
    })
    .concat(aggregates);
}

export function calculate(input: CalculationInput, evidence: readonly Evidence[]): Calculation {
  const operands = input.operands;
  if (!operands.length || (input.operation !== "sum" && operands.length !== 2)) {
    throw new Error(
      "Difference and percentage change require two operands; sum requires at least one.",
    );
  }
  const unit = operands[0].unit;
  for (const operand of operands) {
    if (!Number.isFinite(operand.value) || operand.unit !== unit) {
      throw new Error("Calculation operands must have finite values and matching units.");
    }
    const source = evidence.find((item) => item.evidenceId === operand.evidenceId);
    if (!source || !sourceValues(source, operand.unit).some((value) => value === operand.value)) {
      throw new Error("A calculation operand is not present in its cited evidence.");
    }
  }
  const baseline = operands[0].value;
  const target = operands[1]?.value;
  let result: number;
  let formula: string;
  if (input.operation === "percentage_change") {
    if (baseline === 0) throw new Error("Percentage change is undefined for a zero baseline.");
    result = ((target - baseline) / baseline) * 100;
    formula = `(${target} - ${baseline}) / ${baseline} × 100`;
  } else if (input.operation === "difference") {
    result = target - baseline;
    formula = `${target} - ${baseline}`;
  } else {
    result = operands.reduce((sum, operand) => sum + operand.value, 0);
    formula = operands.map((operand) => operand.value).join(" + ");
  }
  if (!Number.isFinite(result)) throw new Error("The calculation result is not finite.");
  return {
    operation: input.operation,
    operands,
    formula,
    result,
    unit: input.operation === "percentage_change" ? "%" : unit,
  };
}
