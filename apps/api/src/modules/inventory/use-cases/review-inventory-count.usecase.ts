import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { InventoryRepo } from "../inventory.repo.js";

export function reviewInventoryCountUseCase(actorId: string, countId: string, db: Executor = DB) {
  return new InventoryRepo(db).reviewInventoryCount(countId, actorId);
}
