import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateInventoryCountInput } from "../inventory.dto.js";
import { InventoryRepo } from "../inventory.repo.js";

export function createInventoryCountUseCase(
  actorId: string,
  input: CreateInventoryCountInput,
  db: Executor = DB,
) {
  return new InventoryRepo(db).createInventoryCount(actorId, input);
}
