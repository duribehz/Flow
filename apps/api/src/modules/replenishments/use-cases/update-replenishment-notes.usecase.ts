import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function updateReplenishmentNotesUseCase(
  replenishmentId: string,
  notes: string | null,
  db: Executor = DB,
) {
  return new ReplenishmentsRepo(db).updateNotes(replenishmentId, notes);
}
