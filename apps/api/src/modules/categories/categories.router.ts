import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { categoryDtoSchema } from "./categories.dto.js";
import { createCategoryDtoSchema } from "./categories.dto.js";
import { createCategoryUseCase } from "./use-cases/create-category.usecase.js";
import { getCategoriesUseCase } from "./use-cases/get-categories.usecase.js";

export const categoriesRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
        400,
      );
    }
  },
});

categoriesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getCategories",
    tags: ["Categories"],
    summary: "List categories",
    responses: {
      200: {
        description: "Categories",
        content: { "application/json": { schema: z.object({ data: z.array(categoryDtoSchema) }) } },
      },
    },
  }),
  async (ctx) => {
    const categories = await getCategoriesUseCase(ctx.get("db"));
    return ctx.json({ data: categories }, 200);
  },
);

categoriesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postCategories",
    tags: ["Categories"],
    summary: "Create a category",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createCategoryDtoSchema } },
      },
    },
    responses: {
      201: {
        description: "Category created",
        content: { "application/json": { schema: z.object({ data: categoryDtoSchema }) } },
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
  }),
  async (ctx) => {
    const input = ctx.req.valid("json");
    const category = await createCategoryUseCase(input, ctx.get("db"));
    return ctx.json({ data: category }, 201);
  },
);
