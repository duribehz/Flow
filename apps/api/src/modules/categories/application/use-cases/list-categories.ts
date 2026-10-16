import type { CategoryOutput } from "../dto/category-output.js";
import type { CategoriesRepository } from "../ports/categories-repository.js";

export class ListCategories {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  execute(): Promise<CategoryOutput[]> {
    return this.categoriesRepository.findAll();
  }
}
