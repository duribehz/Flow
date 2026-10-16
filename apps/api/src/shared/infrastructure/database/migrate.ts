import { migrate } from "drizzle-orm/node-postgres/migrator";

import { loadConfig } from "@/bootstrap/config.js";
import { createDatabase } from "./client.js";

const config = loadConfig(process.env);
const { db, pool } = createDatabase(config.database);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied successfully");
} finally {
  await pool.end();
}
