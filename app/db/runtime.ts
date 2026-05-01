import {
  createD1Client,
  type D1DatabaseBinding,
  type D1Client,
} from "@/app/db/client";

type GlobalWithD1 = typeof globalThis & {
  DB?: D1DatabaseBinding;
  __D1_DB__?: D1DatabaseBinding;
};

function resolveD1Database(): D1DatabaseBinding | null {
  const g = globalThis as GlobalWithD1;
  return g.DB ?? g.__D1_DB__ ?? null;
}

export function getD1Client(): D1Client {
  const directDb = resolveD1Database();
  if (directDb) {
    return createD1Client(directDb);
  }

  throw new Error("D1 database binding not configured.");
}

export function getOptionalD1Client(): D1Client | null {
  const db = resolveD1Database();
  if (db) {
    return createD1Client(db);
  }
  return null;
}
