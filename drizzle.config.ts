// drizzle.config.ts — updated for individual env vars (no DATABASE_URL required)
import { defineConfig } from "drizzle-kit";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",

  // This format works perfectly with Unix socket paths
  dbCredentials: {
    host: required("INSTANCE_UNIX_SOCKET"), // e.g. /cloudsql/project:region:instance
    port: 5432,                              // always 5432 when using Unix socket
    user: required("DB_USER"),
    password: required("DB_PASS"),
    database: required("DB_NAME"),
    // Optional: explicitly disable SSL in dev/CI if needed
    // ssl: false,
  },

  // Helpful for local dev when you might be using a direct TCP connection
  // (Drizzle Kit will still work — just falls back to TCP if socket doesn't exist)
  verbose: true,
  strict: true,
});