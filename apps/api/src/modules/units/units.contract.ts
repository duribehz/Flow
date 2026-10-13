import { z } from "@hono/zod-openapi";

export const unitSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    symbol: z.string(),
    active: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("Unit");

export const createUnitSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    symbol: z.string().trim().min(1).max(20),
    active: z.boolean().default(true),
  })
  .openapi("CreateUnit");

export const unitIdParamsSchema = z.object({
  unitId: z.uuid().openapi({ param: { name: "unitId", in: "path" } }),
});
