import { z } from "@hono/zod-openapi";

export const categorySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
  })
  .openapi("Category");

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .openapi("CreateCategory");
