import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { BranchSupplySettingsRepo } from "../branch-supply-settings.repo.js";

export async function getBranchSupplySettingUseCase(
  branchId: string,
  supplyId: string,
  db: Executor = DB,
) {
  const setting = await new BranchSupplySettingsRepo(db).get(branchId, supplyId);
  if (!setting) {
    throw new AppError(404, "BRANCH_SUPPLY_SETTING_NOT_FOUND", "Branch supply setting not found");
  }
  return setting;
}
