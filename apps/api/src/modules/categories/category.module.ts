import type { Executor } from "@/shared/infrastructure/database/client.js";
import { CreateCategory } from "./application/use-cases/create-category.js";
import { ListCategories } from "./application/use-cases/list-categories.js";
import { DrizzleCategoriesRepository } from "./infrastructure/persistence/drizzle/drizzle-categories-repository.js";
import { createCategoriesRoutes } from "./presentation/http/categories.routes.js";

export function createCategoryModule(executor: Executor) {
  const repository = new DrizzleCategoriesRepository(executor);

  return createCategoriesRoutes(new ListCategories(repository), new CreateCategory(repository));
}
