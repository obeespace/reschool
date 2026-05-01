import { drizzle as drizzleD1 } from "drizzle-orm/d1";

export type D1Client = ReturnType<typeof drizzleD1>;
export type D1DatabaseBinding = Parameters<typeof drizzleD1>[0];

export function createD1Client(database: D1DatabaseBinding): D1Client {
  return drizzleD1(database);
}
