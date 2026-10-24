import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { BranchSupplySettingsRepo } from "../branch-supply-settings.repo.js";

export function listBranchSupplySettingsUseCase(branchId: string, db: Executor = DB) {
  return new BranchSupplySettingsRepo(db).list(branchId);
}
