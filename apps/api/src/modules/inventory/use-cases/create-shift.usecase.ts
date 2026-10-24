import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import {
  type CreateShiftInput,
  InventoryRepo,
} from "../inventory.repo.js";

export async function createShiftUseCase(
  actorId: string,
  input: CreateShiftInput,
  db: Executor = DB,
) {
  const repo = new InventoryRepo(db);

  const existing = await repo.getOpenShift(input.branchId, input.businessDate, input.shiftName);
  if (existing && existing.status === "open") {
    throw new AppError(
      409,
      "SHIFT_ALREADY_OPEN",
      "An open shift already exists for this branch, date and shift",
    );
  }
  if (existing && existing.status === "closed") {
    throw new AppError(
      409,
      "SHIFT_ALREADY_CLOSED",
      "A closed shift already exists for this branch, date and shift",
    );
  }

  return repo.createShift(actorId, input);
}
