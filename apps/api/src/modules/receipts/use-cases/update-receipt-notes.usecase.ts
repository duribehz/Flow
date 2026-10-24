import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReceiptsRepo } from "../receipts.repo.js";

export function updateReceiptNotesUseCase(
  receiptId: string,
  notes: string | null,
  db: Executor = DB,
) {
  return new ReceiptsRepo(db).updateNotes(receiptId, notes);
}
