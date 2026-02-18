import { Pool, types } from 'pg';

// timestamp without time zone (OID 1114) stores São Paulo local time.
// By default pg interprets it as UTC, causing a -3h offset on display.
// Append -03:00 so JS Date objects carry the correct UTC instant.
types.setTypeParser(1114, (val: string) => new Date(val + '-03:00'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_CA
    ? { ca: process.env.DATABASE_CA, rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

export interface Row {
  [key: string]: unknown;
}

/**
 * Execute parameterized SQL query.
 * ALWAYS use $1, $2 parameters — NEVER interpolate variables.
 */
export async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export { pool };
