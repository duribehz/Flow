import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import { branchesRouter } from "./modules/branches/branches.router.js";
import { categoriesRouter } from "./modules/categories/categories.router.js";
import { inventoryRouter } from "./modules/inventory/inventory.router.js";
import { replenishmentsRouter } from "./modules/replenishments/replenishments.router.js";
import { suppliersRouter } from "./modules/suppliers/suppliers.router.js";
import { suppliesRouter } from "./modules/supplies/supplies.router.js";
import { unitsRouter } from "./modules/units/units.router.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { devActorMiddleware } from "./shared/infrastructure/http/dev-actor.js";
import { configureOpenApi } from "./shared/infrastructure/http/openapi.js";
import type { State } from "./shared/infrastructure/http/state.js";
import { DB } from "./shared/infrastructure/database/client.js";

export const app = new OpenAPIHono<State>();

app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use("*", async (context, next) => {
  context.set("db", DB);
  await next();
});
app.use("*", devActorMiddleware);
app.onError(errorHandler);
app.route("/v1/branches", branchesRouter);
app.route("/v1/categories", categoriesRouter);
app.route("/v1/replenishments", replenishmentsRouter);
app.route("/v1/supplies", suppliesRouter);
app.route("/v1/suppliers", suppliersRouter);
app.route("/v1/units", unitsRouter);

app.route("/v1", inventoryRouter);

configureOpenApi(app);
