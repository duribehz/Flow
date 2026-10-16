import { composeModules } from "./bootstrap/composition-root.js";
import { loadConfig } from "./bootstrap/config.js";
import { createApp } from "./bootstrap/create-app.js";
import { createDatabase } from "./shared/infrastructure/database/client.js";

const config = loadConfig(process.env);
const { db } = createDatabase(config.database);
const modules = composeModules(db);
const app = createApp({ modules, webOrigin: config.webOrigin });

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`Flow API listening on http://localhost:${config.port}`);
