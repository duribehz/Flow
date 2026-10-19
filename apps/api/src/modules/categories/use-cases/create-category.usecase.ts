import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { CategoriesRepo, type CreateCategoryInput } from "../categories.repo.js";

export async function createCategoryUseCase(input: CreateCategoryInput, db: Executor = DB) {
  const categoriesRepo = new CategoriesRepo(db);
  const category = await categoriesRepo.createCategory(input);

  if (!category) {
    throw new AppError(409, "CATEGORY_NAME_CONFLICT", "A category with this name already exists");
  }

  return category;
}
