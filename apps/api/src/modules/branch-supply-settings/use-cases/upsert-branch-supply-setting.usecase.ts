import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { UpsertBranchSupplySettingInput } from "../branch-supply-settings.dto.js";
import { BranchSupplySettingsRepo } from "../branch-supply-settings.repo.js";

export function upsertBranchSupplySettingUseCase(
  branchId: string,
  supplyId: string,
  input: UpsertBranchSupplySettingInput,
  db: Executor = DB,
) {
  return new BranchSupplySettingsRepo(db).upsert(branchId, supplyId, input);
}
