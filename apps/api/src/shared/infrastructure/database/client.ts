import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { AppConfig } from "@/bootstrap/config.js";
import * as schema from "./schema.js";

export function createDatabase(config: AppConfig["database"]) {
  const pool = new Pool(config);
  const db = drizzle(pool, { schema, casing: "snake_case" });

  return { db, pool };
}

export type Database = ReturnType<typeof createDatabase>["db"];

type TransactionCallBack = Parameters<Database["transaction"]>[0];

export type Transaction = Parameters<TransactionCallBack>[0];

export type Executor = Database | Transaction;
