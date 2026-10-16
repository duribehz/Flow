import type { GetReplenishmentDetailOutput } from "../dto/get-replenishment-detail.output.js";
import { ReplenishmentNotFoundError } from "../errors/replenishment-not-found.error.js";
import type { ReplenishmentQueryRepository } from "../ports/replenishment-query.repository.js";

export class GetReplenishmentDetail {
  constructor(private readonly repository: ReplenishmentQueryRepository) {}

  async execute(replenishmentId: string): Promise<GetReplenishmentDetailOutput> {
    const replenishment = await this.repository.findDetailById(replenishmentId);

    if (!replenishment) {
      throw new ReplenishmentNotFoundError();
    }

    return replenishment;
  }
}
