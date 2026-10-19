import { migrate } from "drizzle-orm/node-postgres/migrator";

import { DB, pool } from "./client.js";

try {
  await migrate(DB, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied successfully");
} finally {
  await pool.end();
}
