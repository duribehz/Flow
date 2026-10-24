import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { UpdateInventoryCountInput } from "../inventory.dto.js";
import { InventoryRepo } from "../inventory.repo.js";

export function updateInventoryCountUseCase(
  countId: string,
  input: UpdateInventoryCountInput,
  db: Executor = DB,
) {
  return new InventoryRepo(db).updateInventoryCount(countId, input);
}
