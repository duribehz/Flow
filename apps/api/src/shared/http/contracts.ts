import { z } from "@hono/zod-openapi";

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("ApiError");
