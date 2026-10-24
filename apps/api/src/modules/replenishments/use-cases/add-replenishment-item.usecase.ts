import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { AddReplenishmentRequestItemInput } from "../replenishments.repo.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function addReplenishmentItemUseCase(
  replenishmentId: string,
  input: AddReplenishmentRequestItemInput,
  db: Executor = DB,
) {
  return new ReplenishmentsRepo(db).addItem(replenishmentId, input);
}
