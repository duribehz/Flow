import { z } from "@hono/zod-openapi";

export const createBranchDTO = z.object({
  name: z.string().trim().max(50)
})

export type createBranchType = z.infer<typeof createBranchDTO>;
