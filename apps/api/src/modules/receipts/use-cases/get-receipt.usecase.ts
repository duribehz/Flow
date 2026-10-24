import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReceiptsRepo } from "../receipts.repo.js";

export async function getReceiptUseCase(receiptId: string, db: Executor = DB) {
  const receipt = await new ReceiptsRepo(db).getById(receiptId);
  if (!receipt) throw new AppError(404, "RECEIPT_NOT_FOUND", "Receipt not found");
  return receipt;
}
