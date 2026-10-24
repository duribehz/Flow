import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function updateReplenishmentItemUseCase(
  replenishmentId: string,
  itemId: string,
  input: { requestedQuantity?: number; usagePurposeId?: string },
  db: Executor = DB,
) {
  return new ReplenishmentsRepo(db).updateItem(
    replenishmentId,
    itemId,
    input.requestedQuantity,
    input.usagePurposeId,
  );
}
