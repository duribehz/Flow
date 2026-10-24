import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { UpdateReceiptItemInput } from "../receipts.dto.js";
import { ReceiptsRepo } from "../receipts.repo.js";

export function updateReceiptItemUseCase(
  receiptId: string,
  itemId: string,
  input: UpdateReceiptItemInput,
  db: Executor = DB,
) {
  return new ReceiptsRepo(db).updateItem(receiptId, itemId, input);
}
