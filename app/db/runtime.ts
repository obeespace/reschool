import {
  createD1Client,
  createLocalLibsqlClient,
  type D1DatabaseBinding,
  type D1Client,
} from "@/app/db/client";
import fs from "node:fs";
import path from "node:path";

type GlobalWithD1 = typeof globalThis & {
  DB?: D1DatabaseBinding;
  __D1_DB__?: D1DatabaseBinding;
  __LOCAL_D1_CLIENT__?: D1Client;
};

function resolveD1Database(): D1DatabaseBinding | null {
  const g = globalThis as GlobalWithD1;
  return g.DB ?? g.__D1_DB__ ?? null;
}

function toFileUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function resolveLocalSqlitePath(): string | null {
  const configuredPath = process.env.LOCAL_D1_SQLITE_PATH?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  const d1StateDir = path.join(
    process.cwd(),
    ".wrangler",
    "state",
    "v3",
    "d1",
    "miniflare-D1DatabaseObject"
  );

  if (!fs.existsSync(d1StateDir)) {
    return null;
  }

  const sqliteFiles = fs
    .readdirSync(d1StateDir)
    .filter((entry) => entry.endsWith(".sqlite"));

  if (sqliteFiles.length === 0) {
    return null;
  }

  return path.join(d1StateDir, sqliteFiles[0]);
}

function resolveLocalClient(): D1Client | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const g = globalThis as GlobalWithD1;
  if (g.__LOCAL_D1_CLIENT__) {
    return g.__LOCAL_D1_CLIENT__;
  }

  try {
    const sqlitePath = resolveLocalSqlitePath();
    if (!sqlitePath) {
      return null;
    }

    const client = createLocalLibsqlClient({
      url: sqlitePath.startsWith("file:") ? sqlitePath : toFileUrl(sqlitePath),
      authToken: process.env.LOCAL_D1_AUTH_TOKEN,
    });

    g.__LOCAL_D1_CLIENT__ = client;
    return client;
  } catch (error: unknown) {
    console.warn("Failed to initialize local D1 fallback client", error);
    return null;
  }
}

export function getD1Client(): D1Client {
  const directDb = resolveD1Database();
  if (directDb) {
    return createD1Client(directDb);
  }

  const localClient = resolveLocalClient();
  if (!localClient) {
    throw new Error(
      "D1 database binding not configured. In local dev, run `pnpm db:migrate:local` and set LOCAL_D1_SQLITE_PATH if auto-detection fails."
    );
  }

  return localClient;
}

export function getOptionalD1Client(): D1Client | null {
  const db = resolveD1Database();
  if (db) {
    return createD1Client(db);
  }
  return resolveLocalClient();
}
