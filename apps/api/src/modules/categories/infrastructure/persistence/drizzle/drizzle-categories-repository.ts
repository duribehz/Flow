import { asc } from "drizzle-orm";

import type { CreateCategoryCommand } from "../../../application/dto/create-category-command.js";
import type { CategoriesRepository } from "../../../application/ports/categories-repository.js";
import type { Category } from "../../../domain/category.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { categories } from "./categories.table.js";
import { toCategory } from "./category.mapper.js";

export class DrizzleCategoriesRepository implements CategoriesRepository {
  constructor(private readonly executor: Executor) {}

  async findAll(): Promise<Category[]> {
    const rows = await this.executor.select().from(categories).orderBy(asc(categories.name));
    return rows.map(toCategory);
  }

  async create(command: CreateCategoryCommand): Promise<Category | undefined> {
    const [row] = await this.executor
      .insert(categories)
      .values(command)
      .onConflictDoNothing({ target: categories.name })
      .returning();

    return row ? toCategory(row) : undefined;
  }
}
