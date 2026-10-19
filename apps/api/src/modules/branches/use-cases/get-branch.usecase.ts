import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { BranchesRepo } from "../branches.repo.js";

export async function getBranchUseCase(branchId: string, db: Executor = DB) {
  const branchesRepo = new BranchesRepo(db);
  const branch = await branchesRepo.getBranch(branchId);

  if (!branch) {
    throw new AppError(404, "BRANCH_NOT_FOUND", "Branch not found");
  }

  return branch;
}
