import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliesRepo } from "../supplies.repo.js";

export function getSuppliesUseCase(db: Executor = DB) {
  return new SuppliesRepo(db).getSupplies();
}
