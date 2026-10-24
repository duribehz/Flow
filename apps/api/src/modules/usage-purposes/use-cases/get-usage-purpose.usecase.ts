import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { UsagePurposesRepo } from "../usage-purposes.repo.js";

export async function getUsagePurposeUseCase(usagePurposeId: string, db: Executor = DB) {
  const usagePurpose = await new UsagePurposesRepo(db).getUsagePurposeById(usagePurposeId);

  if (!usagePurpose) {
    throw new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Usage purpose not found");
  }

  return usagePurpose;
}
