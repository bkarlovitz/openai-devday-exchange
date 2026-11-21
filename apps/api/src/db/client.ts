import { Data, Effect } from "effect";
import type { Env } from "../env";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export async function withEvidenceDb<T>(
  binding: Hyperdrive,
  query: (db: NodePgDatabase) => Promise<T>,
): Promise<T> {
  const client = new Client({
    connectionString: binding.connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
  });
  try {
    await client.connect();
    return await query(drizzle(client));
  } finally {
    await client.end();
  }
}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{ cause: unknown }> {}

export function databaseEffect<A>(env: Env, work: (db: NodePgDatabase) => Promise<A>) {
  return Effect.tryPromise({
    try: async () => {
      if (!env.EVIDENCE_DB) throw new Error("The evidence database binding is not configured.");
      return withEvidenceDb(env.EVIDENCE_DB, work);
    },
    catch: (cause) => new DatabaseError({ cause }),
  });
}
