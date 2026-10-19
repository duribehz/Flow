import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { CategoriesRepo } from "../categories.repo.js";

export function getCategoriesUseCase(db: Executor = DB) {
  const categoriesRepo = new CategoriesRepo(db);
  return categoriesRepo.getCategories();
}
