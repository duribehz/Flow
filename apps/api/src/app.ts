import { OpenAPIHono } from "@hono/zod-openapi";

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

const replenishmentsRepo = new ReplenishmentsRepo(db);
const replenishmentUseCase = new ReplenishmentUseCase(replenishmentsRepo);
const suppliesRepo = new SuppliesRepo(db);
const suppliesUseCase = new SuppliesUseCase(suppliesRepo);

app.onError(errorHandler);
app.route("/replenishments", createReplenishmentsRoutes(replenishmentUseCase));
app.route("/supplies", createSuppliesRoutes(suppliesUseCase));

configureOpenApi(app);
