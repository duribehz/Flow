import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";

import { categories } from "../supplies/supplies.schema.js";

export const categoryDtoSchema = createSelectSchema(categories).openapi("Category");

export const createCategoryDtoSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .openapi("CreateCategory");
