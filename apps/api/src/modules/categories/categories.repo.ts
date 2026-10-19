import { asc } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { categories } from "../supplies/supplies.schema.js";

export type CreateCategoryInput = Pick<typeof categories.$inferInsert, "name">;

export class CategoriesRepo {
  constructor(private readonly conn: Executor) {}

  getCategories() {
    return this.conn.select().from(categories).orderBy(asc(categories.name));
  }

  async createCategory(input: CreateCategoryInput) {
    const [category] = await this.conn
      .insert(categories)
      .values(input)
      .onConflictDoNothing({ target: categories.name })
      .returning();

    return category;
  }
}

export type Category = Awaited<ReturnType<CategoriesRepo["getCategories"]>>[number];
