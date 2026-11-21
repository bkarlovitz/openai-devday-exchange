import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  check,
  integer,
  jsonb,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array }>({ dataType: () => "bytea" });

export const dataset = pgTable("dataset", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  searchText: text("search_text").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddingModel: text("embedding_model"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

function snapshotFields() {
  return {
    id: bigint("id", { mode: "bigint" }).generatedAlwaysAsIdentity().primaryKey(),
    datasetId: text("dataset_id")
      .notNull()
      .references(() => dataset.id),
    resourceKey: text("resource_key").notNull(),
    resourceUrl: text("resource_url").notNull(),
    sha256: text("sha256").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    rowCount: integer("row_count").notNull(),
  };
}
export const snapshot = pgTable("snapshot", snapshotFields(), (table) => [
  unique().on(table.datasetId, table.resourceKey, table.sha256),
  check("snapshot_row_count_check", sql`${table.rowCount} >= 0`),
]);

export const latestSnapshot = pgView("latest_snapshot", snapshotFields()).existing();

export const sourceRow = pgTable(
  "source_row",
  {
    snapshotId: bigint("snapshot_id", { mode: "bigint" })
      .notNull()
      .references(() => snapshot.id),
    rowNumber: integer("row_number").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.snapshotId, table.rowNumber] })],
);

export const sourceDocument = pgTable("source_document", {
  snapshotId: bigint("snapshot_id", { mode: "bigint" })
    .primaryKey()
    .references(() => snapshot.id),
  contentType: text("content_type").notNull(),
  content: bytea("content").notNull(),
});
