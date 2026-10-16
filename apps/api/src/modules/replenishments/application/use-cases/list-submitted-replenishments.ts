import type { ListSubmittedReplenishmentsOutput } from "../dto/list-submitted-replenishments.output.js";
import type { ReplenishmentQueryRepository } from "../ports/replenishment-query.repository.js";

export class ListSubmittedReplenishments {
  constructor(private readonly repository: ReplenishmentQueryRepository) {}

  execute(): Promise<ListSubmittedReplenishmentsOutput> {
    return this.repository.findSubmitted();
  }
}
