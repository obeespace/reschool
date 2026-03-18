import { createClient } from "@libsql/client";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";

export type D1Client = ReturnType<typeof drizzleLibsql>;
export type D1DatabaseBinding = Parameters<typeof drizzleD1>[0];

export function createD1Client(database: D1DatabaseBinding): D1Client {
  // D1 and libSQL drizzle clients expose the same query-builder surface used by routes.
  return drizzleD1(database) as unknown as D1Client;
}

export function createLocalLibsqlClient(params: {
  url: string;
  authToken?: string;
}): D1Client {
  const client = createClient({
    url: params.url,
    authToken: params.authToken,
  });
  return drizzleLibsql(client);
}
