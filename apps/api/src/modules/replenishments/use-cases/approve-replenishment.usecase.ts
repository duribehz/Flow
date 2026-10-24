import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function approveReplenishmentUseCase(
  replenishmentId: string,
  actorId: string,
  db: Executor = DB,
) {
  return new ReplenishmentsRepo(db).approve(replenishmentId, actorId);
}
