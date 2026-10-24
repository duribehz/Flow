import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReceiptsRepo } from "../receipts.repo.js";

export function completeReceiptUseCase(receiptId: string, db: Executor = DB) {
  return new ReceiptsRepo(db).complete(receiptId);
}
