import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";

import { branches } from "./branches.schema.js";

export const createBranchDTO = z
  .object({
    name: z.string().trim().min(1).max(50),
  })
  .openapi("CreateBranch");

export const branchesDto = createSelectSchema(branches).openapi("Branch");

export const branchIdParamsDto = z.object({
  branchId: z.uuid().openapi({ param: { name: "branchId", in: "path" } }),
});

export type createBranchType = z.infer<typeof createBranchDTO>;
