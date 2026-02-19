type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

export class ApiRequestError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const PREFIX = "reschool:cache:";

function now() {
  return Date.now();
}

function toStorageKey(key: string) {
  return `${PREFIX}${key}`;
}

function readFromSession<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(toStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeToSession<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(toStorageKey(key), JSON.stringify(entry));
  } catch {
    // no-op (storage full/disabled)
  }
}

export function invalidateCache(key: string) {
  memoryCache.delete(key);
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(toStorageKey(key));
  }
}

export async function cachedApiGet<T>(params: {
  key: string;
  url: string;
  headers?: HeadersInit;
  ttlMs?: number;
  forceRefresh?: boolean;
}): Promise<T> {
  const { key, url, headers, ttlMs = 30_000, forceRefresh = false } = params;
  const currentTime = now();

  if (!forceRefresh) {
    const memoryHit = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memoryHit && memoryHit.expiresAt > currentTime) {
      return memoryHit.data;
    }

    const sessionHit = readFromSession<T>(key);
    if (sessionHit && sessionHit.expiresAt > currentTime) {
      memoryCache.set(key, sessionHit as CacheEntry<unknown>);
      return sessionHit.data;
    }
  }

  if (inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const requestPromise = fetch(url, {
    method: "GET",
    headers,
  })
    .then(async (response) => {
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : `Request failed with status ${response.status}`);

        throw new ApiRequestError(message, response.status, payload);
      }

      const entry: CacheEntry<T> = {
        expiresAt: currentTime + ttlMs,
        data: payload as T,
      };

      memoryCache.set(key, entry as CacheEntry<unknown>);
      writeToSession(key, entry);
      return payload as T;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, requestPromise as Promise<unknown>);
  return requestPromise;
}
