// db.ts — Supports both Replit (DATABASE_URL) and GCP Cloud SQL (Unix socket)
import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

const required = (name: string) => {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is required`);
  return val;
};

let pool: pg.Pool;

// Check if running in Replit/Neon environment (has DATABASE_URL)
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  });
  console.log("Connected to DB via DATABASE_URL (Replit/Neon)");
} else if (process.env.DB_USER) {
  // GCP Cloud SQL with Unix socket (production/dev environments)
  pool = new Pool({
    user: required("DB_USER"),
    password: required("DB_PASS"),
    database: required("DB_NAME"),
    host: required("INSTANCE_UNIX_SOCKET"),
    port: 5432,
    max: 5,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    // @ts-ignore — this is a valid pg option for Unix sockets
    socketPath: required("INSTANCE_UNIX_SOCKET"),
  });
  console.log("Connected to DB via Unix socket (GCP Cloud SQL)");
} else {
  throw new Error("No database connection configured. Set DATABASE_URL or DB_USER/DB_PASS/DB_NAME/INSTANCE_UNIX_SOCKET");
}

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

export { pool };
export const db = drizzle({ client: pool, schema });
