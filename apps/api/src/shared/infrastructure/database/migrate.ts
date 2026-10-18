import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db, pool } from "./client.js";

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied successfully");
} finally {
  await pool.end();
}
