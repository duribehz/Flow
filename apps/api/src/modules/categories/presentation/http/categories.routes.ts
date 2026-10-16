import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { CategoryOutput } from "../../application/dto/category-output.js";
import type { CreateCategoryCommand } from "../../application/dto/create-category-command.js";
import { errorSchema } from "@/shared/presentation/http/contracts.js";
import { categorySchema, createCategorySchema } from "./categories.contract.js";

const listCategoriesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Categories"],
  summary: "List categories",
  responses: {
    200: {
      description: "Categories",
      content: { "application/json": { schema: z.object({ data: z.array(categorySchema) }) } },
    },
  },
});

const createCategoryRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Categories"],
  summary: "Create a category",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createCategorySchema } },
    },
  },
  responses: {
    201: {
      description: "Category created",
      content: { "application/json": { schema: z.object({ data: categorySchema }) } },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: errorSchema } },
    },
    409: {
      description: "Category name already exists",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export interface ListCategoriesUseCase {
  execute(): Promise<CategoryOutput[]>;
}

export interface CreateCategoryUseCase {
  execute(command: CreateCategoryCommand): Promise<CategoryOutput>;
}

export function createCategoriesRoutes(
  listCategories: ListCategoriesUseCase,
  createCategory: CreateCategoryUseCase,
) {
  const routes = new OpenAPIHono({
    defaultHook: (result, context) => {
      if (!result.success) {
        return context.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
          400,
        );
      }
    },
  });

  routes.openapi(listCategoriesRoute, async (context) => {
    const categories = await listCategories.execute();
    return context.json({ data: categories }, 200);
  });

  routes.openapi(createCategoryRoute, async (context) => {
    const category = await createCategory.execute(context.req.valid("json"));
    return context.json({ data: category }, 201);
  });

  return routes;
}
