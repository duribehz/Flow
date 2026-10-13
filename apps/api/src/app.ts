import { OpenAPIHono } from "@hono/zod-openapi";

import { ReplenishmentUseCase } from "./modules/replenishments/replenishment.usecase.js";
import { ReplenishmentsRepo } from "./modules/replenishments/replenishments.repo.js";
import { createReplenishmentsRoutes } from "./modules/replenishments/replenishments.routes.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { configureOpenApi } from "./shared/http/openapi.js";
import { db } from "./shared/infrastructure/database/client.js";

export const app = new OpenAPIHono();

const replenishmentsRepo = new ReplenishmentsRepo(db);
const replenishmentUseCase = new ReplenishmentUseCase(replenishmentsRepo);

app.onError(errorHandler);
app.route("/replenishments", createReplenishmentsRoutes(replenishmentUseCase));

configureOpenApi(app);
