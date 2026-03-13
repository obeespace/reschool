type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function shouldBypassServerCache(req: Request): boolean {
  const cacheControl = req.headers.get("cache-control") || "";
  const pragma = req.headers.get("pragma") || "";
  return (
    cacheControl.includes("no-store") ||
    cacheControl.includes("no-cache") ||
    pragma.includes("no-cache")
  );
}

export async function getOrSetServerCache<T>(params: {
  key: string;
  ttlMs: number;
  bypass?: boolean;
  factory: () => Promise<T>;
}): Promise<T> {
  const { key, ttlMs, bypass = false, factory } = params;
  const now = Date.now();

  if (!bypass) {
    const cached = responseCache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      return cloneValue(cached.value);
    }
  }

  if (inflight.has(key)) {
    return cloneValue((await inflight.get(key)) as T);
  }

  const task = factory()
    .then((result) => {
      if (!bypass) {
        responseCache.set(key, {
          expiresAt: now + ttlMs,
          value: cloneValue(result),
        });
      }
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, task as Promise<unknown>);
  return cloneValue(await task);
}

export function invalidateServerCacheByPrefix(prefix: string): void {
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
}
