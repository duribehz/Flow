import { AppError } from "@/shared/errors/app-error.js";
import type { ReplenishmentsRepository } from "./replenishments.repo.js";

export class ReplenishmentUseCase {
  constructor(private readonly replenishmentsRepo: ReplenishmentsRepository) {}

  getSubmittedReplenishments() {
    return this.replenishmentsRepo.getSubmittedReplenishments();
  }

  async getReplenishmentById(replenishmentId: string) {
    const replenishment = await this.replenishmentsRepo.getReplenishmentById(replenishmentId);

    if (!replenishment) {
      throw new AppError(404, "REPLENISHMENT_NOT_FOUND", "Replenishment request not found");
    }

    return replenishment;
  }
}
