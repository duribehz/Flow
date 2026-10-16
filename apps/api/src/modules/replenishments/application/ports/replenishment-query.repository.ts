import type {
  ReplenishmentDetailReadModel,
  SubmittedReplenishmentReadModel,
} from "../../domain/read-models/replenishment.read-model.js";

export interface ReplenishmentQueryRepository {
  findSubmitted(): Promise<SubmittedReplenishmentReadModel[]>;
  findDetailById(replenishmentId: string): Promise<ReplenishmentDetailReadModel | undefined>;
}
