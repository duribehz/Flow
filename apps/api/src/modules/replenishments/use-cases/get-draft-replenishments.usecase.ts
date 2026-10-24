import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function getDraftReplenishmentsUseCase(db: Executor = DB) {
  return new ReplenishmentsRepo(db).getDraftReplenishments();
}
