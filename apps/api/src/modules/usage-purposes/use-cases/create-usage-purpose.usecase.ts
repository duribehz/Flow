import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateUsagePurposeInput } from "../usage-purposes.dto.js";
import { UsagePurposesRepo } from "../usage-purposes.repo.js";

export async function createUsagePurposeUseCase(input: CreateUsagePurposeInput, db: Executor = DB) {
  const usagePurpose = await new UsagePurposesRepo(db).createUsagePurpose(input);

  if (!usagePurpose) {
    throw nameConflictError();
  }

  return usagePurpose;
}

function nameConflictError() {
  return new AppError(
    409,
    "USAGE_PURPOSE_NAME_CONFLICT",
    "A usage purpose with this name already exists",
  );
}
