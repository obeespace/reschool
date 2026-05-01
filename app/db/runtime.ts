import { createDbClient, type D1Client } from "@/app/db/client";

export type { D1Client };

let _client: D1Client | null = null;

export function getD1Client(): D1Client {
  if (!_client) {
    _client = createDbClient();
  }
  return _client;
}

export function getOptionalD1Client(): D1Client | null {
  try {
    return getD1Client();
  } catch {
    return null;
  }
}
