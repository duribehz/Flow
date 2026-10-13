import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import { CategoriesRepo } from "./modules/categories/categories.repo.js";
import { createCategoriesRoutes } from "./modules/categories/categories.routes.js";
import { CategoriesUseCase } from "./modules/categories/categories.usecase.js";
import { ReplenishmentUseCase } from "./modules/replenishments/replenishment.usecase.js";
import { ReplenishmentsRepo } from "./modules/replenishments/replenishments.repo.js";
import { createReplenishmentsRoutes } from "./modules/replenishments/replenishments.routes.js";
import { SuppliesRepo } from "./modules/supplies/supplies.repo.js";
import { createSuppliesRoutes } from "./modules/supplies/supplies.routes.js";
import { SuppliesUseCase } from "./modules/supplies/supplies.usecase.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { configureOpenApi } from "./shared/http/openapi.js";
import { db } from "./shared/infrastructure/database/client.js";

export const app = new OpenAPIHono();

const categoriesRepo = new CategoriesRepo(db);
const categoriesUseCase = new CategoriesUseCase(categoriesRepo);
const replenishmentsRepo = new ReplenishmentsRepo(db);
const replenishmentUseCase = new ReplenishmentUseCase(replenishmentsRepo);
const suppliesRepo = new SuppliesRepo(db);
const suppliesUseCase = new SuppliesUseCase(suppliesRepo);

app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.onError(errorHandler);
app.route("/categories", createCategoriesRoutes(categoriesUseCase));
app.route("/replenishments", createReplenishmentsRoutes(replenishmentUseCase));
app.route("/supplies", createSuppliesRoutes(suppliesUseCase));

configureOpenApi(app);
