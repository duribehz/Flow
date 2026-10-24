import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateInventoryDayInput } from "../inventory.dto.js";
import { InventoryRepo } from "../inventory.repo.js";

export function openInventoryDayUseCase(
  actorId: string,
  input: CreateInventoryDayInput,
  db: Executor = DB,
) {
  return new InventoryRepo(db).openInventoryDay(actorId, input);
}
