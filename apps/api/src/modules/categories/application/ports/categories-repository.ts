import type { CreateCategoryCommand } from "../dto/create-category-command.js";
import type { Category } from "../../domain/category.js";

export interface CategoriesRepository {
  findAll(): Promise<Category[]>;
  create(command: CreateCategoryCommand): Promise<Category | undefined>;
}
