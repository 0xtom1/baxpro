// server/migrate.ts — Supports both Replit (DATABASE_URL) and GCP Cloud SQL (Unix socket)
import { migrate } from "drizzle-orm/node-postgres/migrator";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { log } from "./utils";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  const start = Date.now();
  log(`[MIGRATE] Starting migrations at ${new Date().toISOString()}`);
  log(`[MIGRATE] Environment: ${process.env.DATABASE_URL ? "Replit/Neon" : "GCP Cloud SQL"}`);

  // For GCP Cloud SQL with Unix socket, wait for the socket to become available
  if (!process.env.DATABASE_URL && process.env.INSTANCE_UNIX_SOCKET) {
    const socketDir = process.env.INSTANCE_UNIX_SOCKET;
    const expectedSocket = path.join(socketDir, ".s.PGSQL.5432");
    log(`[MIGRATE] Waiting for Unix socket: ${expectedSocket}`);

    // Check dir existence first
    try {
      fs.statSync(socketDir);
      log(`[MIGRATE] Socket directory exists`);
    } catch (dirErr: any) {
      log(`[MIGRATE] Socket directory missing: ${dirErr.message}`);
      process.exit(1);
    }

    // Poll for socket (up to 30s for cold start)
    let socketFound = false;
    for (let i = 0; i < 15; i++) {
      try {
        const stats = fs.statSync(expectedSocket);
        if (stats.isSocket()) {
          log(`[MIGRATE] Socket ready after ${i * 2}s`);
          socketFound = true;
          break;
        }
      } catch (sockErr: any) {
        log(`[MIGRATE] Waiting for socket... (${i * 2}s)`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!socketFound) {
      log(`[MIGRATE] Socket never appeared - Cloud SQL Connector may have failed`);
      process.exit(1);
    }
  }

  // Test database connection
  log("[MIGRATE] Testing database connection...");
  try {
    const queryStart = Date.now();
    await db.execute(sql`SELECT 1 AS connected`);
    log(`[MIGRATE] Database connected in ${Date.now() - queryStart}ms`);
  } catch (error: any) {
    log(`[MIGRATE] Database connection failed: ${error.message}`);
    console.error("[MIGRATE] Full error:", error);
    process.exit(1);
  }

  // Run migrations
  const migrateStart = Date.now();
  await migrate(db, { migrationsFolder: "./migrations" });
  log(`[MIGRATE] Migrations completed in ${Date.now() - migrateStart}ms`);
  log(`[MIGRATE] Total time: ${Date.now() - start}ms`);
}
