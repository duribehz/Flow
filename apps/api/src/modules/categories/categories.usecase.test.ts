import { describe, expect, test } from "bun:test";

import { AppError } from "@/shared/errors/app-error.js";
import type { CategoriesRepository, Category } from "./categories.repo.js";
import { CategoriesUseCase } from "./categories.usecase.js";

export const category: Category = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Aceites",
};

function createRepo(duplicateName = false): CategoriesRepository {
  return {
    async getCategories() {
      return [category];
    },
    async createCategory() {
      return duplicateName ? undefined : category;
    },
  };
}

describe("CategoriesUseCase", () => {
  test("lists categories", async () => {
    const useCase = new CategoriesUseCase(createRepo());
    await expect(useCase.getCategories()).resolves.toEqual([category]);
  });

  test("creates a category", async () => {
    const useCase = new CategoriesUseCase(createRepo());
    await expect(useCase.createCategory({ name: category.name })).resolves.toEqual(category);
  });

  test("rejects a duplicated name", async () => {
    const useCase = new CategoriesUseCase(createRepo(true));
    await expect(useCase.createCategory({ name: category.name })).rejects.toMatchObject({
      status: 409,
      code: "CATEGORY_NAME_CONFLICT",
    } satisfies Partial<AppError>);
  });
});
