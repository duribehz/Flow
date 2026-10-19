import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { BranchesRepo } from "../branches.repo.js";

export async function getBranchesUseCase(db: Executor = DB) {
  const branchesRepo = new BranchesRepo(db);
  return branchesRepo.getBranches();
}
