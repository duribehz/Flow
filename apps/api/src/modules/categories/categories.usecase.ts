import { AppError } from "@/shared/errors/app-error.js";
import type { CategoriesRepository, CreateCategoryInput } from "./categories.repo.js";

export class CategoriesUseCase {
  constructor(private readonly categoriesRepo: CategoriesRepository) {}

  getCategories() {
    return this.categoriesRepo.getCategories();
  }

  async createCategory(input: CreateCategoryInput) {
    const category = await this.categoriesRepo.createCategory(input);

    if (!category) {
      throw new AppError(409, "CATEGORY_NAME_CONFLICT", "A category with this name already exists");
    }

    return category;
  }
}
