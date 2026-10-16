import type { CategoryOutput } from "../dto/category-output.js";
import type { CreateCategoryCommand } from "../dto/create-category-command.js";
import { CategoryNameConflictError } from "../errors/category-name-conflict-error.js";
import type { CategoriesRepository } from "../ports/categories-repository.js";

export class CreateCategory {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(command: CreateCategoryCommand): Promise<CategoryOutput> {
    const category = await this.categoriesRepository.create(command);

    if (!category) {
      throw new CategoryNameConflictError();
    }

    return category;
  }
}
