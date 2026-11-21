import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export async function withEvidenceDb<T>(
  binding: Hyperdrive,
  query: (db: NodePgDatabase) => Promise<T>,
): Promise<T> {
  const client = new Client({
    connectionString: binding.connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
  });
  try {
    await client.connect();
    return await query(drizzle(client));
  } finally {
    await client.end();
  }
}
