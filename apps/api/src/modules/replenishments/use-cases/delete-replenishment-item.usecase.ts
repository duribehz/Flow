import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function deleteReplenishmentItemUseCase(
  replenishmentId: string,
  itemId: string,
  db: Executor = DB,
) {
  return new ReplenishmentsRepo(db).deleteItem(replenishmentId, itemId);
}
