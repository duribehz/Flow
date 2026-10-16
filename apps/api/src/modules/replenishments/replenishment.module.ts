import type { Executor } from "@/shared/infrastructure/database/client.js";
import { GetReplenishmentDetail } from "./application/use-cases/get-replenishment-detail.js";
import { ListSubmittedReplenishments } from "./application/use-cases/list-submitted-replenishments.js";
import { DrizzleReplenishmentQueryRepository } from "./infrastructure/persistence/drizzle/drizzle-replenishment-query.repository.js";
import { createReplenishmentRoutes } from "./presentation/http/replenishment.routes.js";

export function createReplenishmentModule(connection: Executor) {
  const repository = new DrizzleReplenishmentQueryRepository(connection);

  return createReplenishmentRoutes({
    listSubmitted: new ListSubmittedReplenishments(repository),
    getDetail: new GetReplenishmentDetail(repository),
  });
}
