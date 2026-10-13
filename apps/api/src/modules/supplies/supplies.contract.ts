import { z } from "@hono/zod-openapi";

const dateTimeSchema = z.iso.datetime();

export const supplySchema = z
  .object({
    id: z.uuid(),
    sku: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    unitCost: z.number().int().nonnegative(),
    active: z.boolean(),
    category: z.object({
      id: z.uuid(),
      name: z.string(),
    }),
    unit: z.object({
      id: z.uuid(),
      name: z.string(),
      symbol: z.string(),
    }),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  })
  .openapi("Supply");

export const createSupplySchema = z
  .object({
    sku: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).nullable().optional(),
    unitId: z.uuid(),
    unitCost: z.number().int().nonnegative().default(0),
    categoryId: z.uuid(),
    active: z.boolean().default(true),
  })
  .openapi("CreateSupply");
