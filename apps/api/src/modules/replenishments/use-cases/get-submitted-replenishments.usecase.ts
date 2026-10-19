import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function getSubmittedReplenishmentsUseCase(db: Executor = DB) {
  const replenishmentsRepo = new ReplenishmentsRepo(db);
  return replenishmentsRepo.getSubmittedReplenishments();
}
