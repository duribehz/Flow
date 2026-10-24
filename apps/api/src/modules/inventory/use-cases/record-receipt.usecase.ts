import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { type RecordReceiptInput, InventoryRepo } from "../inventory.repo.js";

export async function recordReceiptUseCase(
  actorId: string,
  shiftId: string,
  input: RecordReceiptInput,
  db: Executor = DB,
) {
  const repo = new InventoryRepo(db);

  const shift = await repo.getShift(shiftId);
  if (!shift) {
    throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
  }
  if (shift.status === "closed") {
    throw new AppError(
      409,
      "SHIFT_CLOSED",
      "Cannot record a receipt for a closed shift",
    );
  }

  return repo.insertReceipt(actorId, shiftId, input);
}
