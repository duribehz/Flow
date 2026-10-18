import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/http/contracts.js";
import { categorySchema, createCategorySchema } from "./categories.contract.js";
import type { CategoriesUseCase } from "./categories.usecase.js";

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

type CategoriesService = Pick<CategoriesUseCase, "getCategories" | "createCategory">;

export function createCategoriesRoutes(useCase: CategoriesService) {
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
    const categories = await useCase.getCategories();
    return context.json({ data: categories }, 200);
  });

  routes.openapi(createCategoryRoute, async (context) => {
    const input = context.req.valid("json");
    const category = await useCase.createCategory(input);
    return context.json({ data: category }, 201);
  });

  return routes;
}
