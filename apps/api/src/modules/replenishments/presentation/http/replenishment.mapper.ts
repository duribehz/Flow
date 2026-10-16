import type { GetReplenishmentDetailOutput } from "../../application/dto/get-replenishment-detail.output.js";
import type { ListSubmittedReplenishmentsOutput } from "../../application/dto/list-submitted-replenishments.output.js";

export function toSubmittedReplenishmentResponse(
  replenishment: ListSubmittedReplenishmentsOutput[number],
) {
  return {
    ...replenishment,
    submittedAt: replenishment.submittedAt?.toISOString() ?? null,
    createdAt: replenishment.createdAt.toISOString(),
  };
}

export function toReplenishmentDetailResponse(replenishment: GetReplenishmentDetailOutput) {
  return {
    ...replenishment,
    submittedAt: replenishment.submittedAt?.toISOString() ?? null,
    reviewedAt: replenishment.reviewedAt?.toISOString() ?? null,
    createdAt: replenishment.createdAt.toISOString(),
    updatedAt: replenishment.updatedAt.toISOString(),
    items: replenishment.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
