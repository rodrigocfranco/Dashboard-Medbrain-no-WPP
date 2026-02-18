import { Pool, types } from 'pg';

// Timestamps in this DB store São Paulo local time but without proper offset.
// OID 1114 = timestamp without time zone
// OID 1184 = timestamp with time zone (pg sends value with +00, but it's actually SP time)
// Fix: strip any existing offset and re-interpret as São Paulo (-03:00).
types.setTypeParser(1114, (val: string) => new Date(val + '-03:00'));
types.setTypeParser(1184, (val: string) => {
  const withoutTz = val.replace(/[+-]\d{2}(:\d{2})?$/, '');
  return new Date(withoutTz + '-03:00');
});

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
