// Stub for @libsql/client used during Cloudflare Worker builds.
// The actual @libsql/client is NEVER called in Workers — the D1 binding is
// always resolved first in runtime.ts. This stub prevents esbuild from
// trying to bundle @libsql/client (which has a broken "workerd" export).
export function createClient(_config: unknown): never {
  throw new Error(
    "@libsql/client is not available in Cloudflare Workers. " +
      "Use the D1 database binding instead."
  );
}
