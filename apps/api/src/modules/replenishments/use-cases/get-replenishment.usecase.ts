import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export async function getReplenishmentUseCase(replenishmentId: string, db: Executor = DB) {
  const replenishmentsRepo = new ReplenishmentsRepo(db);
  const replenishment = await replenishmentsRepo.getReplenishmentById(replenishmentId);

  if (!replenishment) {
    throw new AppError(404, "REPLENISHMENT_NOT_FOUND", "Replenishment request not found");
  }

  return replenishment;
}
