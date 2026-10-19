import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { BranchesRepo, type CreateBranchInput } from "../branches.repo.js";

export async function createBranchUseCase(input: CreateBranchInput, db: Executor = DB) {
  const branchesRepo = new BranchesRepo(db);
  return branchesRepo.createBranch(input);
}
