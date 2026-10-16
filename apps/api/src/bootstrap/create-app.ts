import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import type { ApplicationModules } from "./composition-root.js";
import { errorHandler } from "@/shared/presentation/http/error-handler.js";
import { configureOpenApi } from "@/shared/presentation/http/openapi.js";

interface CreateAppOptions {
  modules: ApplicationModules;
  webOrigin: string;
}

export function createApp({ modules, webOrigin }: CreateAppOptions) {
  const app = new OpenAPIHono();

  app.use("*", cors({ origin: webOrigin, credentials: true }));
  app.onError(errorHandler);
  app.route("/categories", modules.categories);
  app.route("/replenishments", modules.replenishments);
  app.route("/supplies", modules.supplies);
  app.route("/suppliers", modules.suppliers);
  app.route("/units", modules.units);

  configureOpenApi(app);

  return app;
}
