import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";

import { units } from "../supplies/supplies.schema.js";

export const createUnitDtoSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    symbol: z.string().trim().min(1).max(20),
    active: z.boolean().default(true),
  })
  .openapi("CreateUnit");

export const unitDtoSchema = createSelectSchema(units).openapi("Unit");

export const unitIdParamsSchema = z.object({
  unitId: z.uuid().openapi({ param: { name: "unitId", in: "path" } }),
});
