import { and, asc, eq, ilike, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Schema } from "effect";
import { DatasetQueryInput } from "@council/contracts";
import type { DatasetEvidence, SourceField } from "@council/contracts";
import type { Env } from "../env";
import { databaseEffect } from "../db/client";
import { latestSnapshot, snapshot, sourceRow } from "../db/schema";
import { describeFields } from "./dataset-fields";
import { EvidenceNotFound, QueryInputError, snapshotReference } from "./catalogue";

function numericValue(field: string) {
  const value = sql<string>`${sourceRow.data}->>${field}`;
  return sql`CASE WHEN COALESCE(${sourceRow.data}->>'Secreto', 'false') <> 'true' AND ${value} ~ '^[+-]?[0-9]+([.][0-9]+)?$' THEN (${value})::numeric END`;
}

function requireField(fields: SourceField[], name: string): SourceField {
  const field = fields.find((item) => item.name === name);
  if (!field)
    throw new QueryInputError(`Unsupported field "${name}". Inspect this resource's fields first.`);
  return field;
}

export function queryDataset(env: Env, input: unknown) {
  const options = Schema.decodeUnknownSync(DatasetQueryInput)(input);
  return databaseEffect(env, async (db): Promise<DatasetEvidence> => {
    const table = options.snapshotId ? snapshot : latestSnapshot;
    const resources = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.datasetId, options.datasetId),
          options.snapshotId ? eq(table.id, BigInt(options.snapshotId)) : undefined,
          options.resourceKey ? eq(table.resourceKey, options.resourceKey) : undefined,
        ),
      )
      .limit(2);
    if (!resources.length) throw new EvidenceNotFound("Dataset snapshot not found.");
    if (resources.length > 1)
      throw new QueryInputError("Choose a resourceKey or snapshotId from inspect_dataset.");
    const resource = resources[0];
    const [sample] = await db
      .select({ data: sourceRow.data })
      .from(sourceRow)
      .where(eq(sourceRow.snapshotId, resource.id))
      .orderBy(asc(sourceRow.rowNumber))
      .limit(1);
    const fields = describeFields(options.datasetId, sample?.data ?? {});
    const filters: SQL[] = [eq(sourceRow.snapshotId, resource.id)];
    if (options.afterRow) filters.push(sql`${sourceRow.rowNumber} > ${options.afterRow}`);
    for (const filter of options.filters) {
      const field = requireField(fields, filter.field);
      const value = sql<string>`${sourceRow.data}->>${field.name}`;
      if (filter.op === "eq") filters.push(eq(value, filter.value));
      else if (filter.op === "ne") filters.push(ne(value, filter.value));
      else if (filter.op === "contains") filters.push(ilike(value, `%${filter.value}%`));
      else {
        if (field.type !== "number" || !/^[+-]?[0-9]+([.][0-9]+)?$/.test(filter.value)) {
          throw new QueryInputError(
            "Numeric comparisons require a numeric field and decimal operand.",
          );
        }
        const operators = { gt: sql`>`, gte: sql`>=`, lt: sql`<`, lte: sql`<=` };
        filters.push(
          sql`${numericValue(field.name)} ${operators[filter.op]} ${filter.value}::numeric`,
        );
      }
    }
    options.fields?.forEach((field) => requireField(fields, field));
    let ordering = sql`${sourceRow.rowNumber} ASC`;
    if (options.orderBy) {
      const field = requireField(fields, options.orderBy.field);
      const value =
        field.type === "number" ? numericValue(field.name) : sql`${sourceRow.data}->>${field.name}`;
      ordering = sql`${value} ${options.orderBy.direction === "asc" ? sql`ASC` : sql`DESC`} NULLS LAST, ${sourceRow.rowNumber} ASC`;
    }
    const where = and(...filters);
    const rows = await db
      .select({ rowNumber: sourceRow.rowNumber, data: sourceRow.data })
      .from(sourceRow)
      .where(where)
      .orderBy(ordering)
      .limit(options.limit)
      .offset(options.offset);
    const [counts] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(sourceRow)
      .where(where);
    const result: DatasetEvidence = {
      snapshot: snapshotReference(resource),
      query: options,
      fields,
      totalRows: counts.total,
      rowsAreSample: options.offset > 0 || counts.total > rows.length,
      rows: rows.map((row) => ({
        rowNumber: row.rowNumber,
        data: row.data,
        selectedValues: options.fields
          ? Object.fromEntries(options.fields.map((field) => [field, row.data[field]]))
          : undefined,
      })),
    };
    if (options.aggregate) {
      const { operation, field: name } = options.aggregate;
      if (operation === "count")
        result.aggregate = { operation, value: String(counts.total), status: "complete" };
      else {
        if (!name) throw new QueryInputError("This aggregation requires a field.");
        const field = requireField(fields, name);
        if (field.type !== "number")
          throw new QueryInputError(
            "Aggregate only a numeric measure, never a territory code or period.",
          );
        const value = numericValue(name);
        const operations = {
          sum: sql`sum(${value})`,
          avg: sql`avg(${value})`,
          min: sql`min(${value})`,
          max: sql`max(${value})`,
        };
        const [aggregate] = await db
          .select({
            value: sql<string | null>`(${operations[operation]})::text`,
            valid: sql<number>`count(${value})::int`,
          })
          .from(sourceRow)
          .where(where);
        const complete = aggregate.valid === counts.total;
        result.aggregate = {
          operation,
          field: name,
          unit: field.unit,
          value: complete ? aggregate.value : null,
          numericRows: aggregate.valid,
          status: complete ? "complete" : "missing_numeric_values",
        };
      }
    }
    return result;
  });
}
