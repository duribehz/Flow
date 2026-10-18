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
    suppliers: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
      }),
    ),
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
    supplierIds: z
      .array(z.uuid())
      .min(1)
      .refine((supplierIds) => new Set(supplierIds).size === supplierIds.length, {
        message: "Supplier IDs must be unique",
      }),
    active: z.boolean().default(true),
  })
  .openapi("CreateSupply");

export const replaceSupplySuppliersSchema = z
  .object({
    supplierIds: z
      .array(z.uuid())
      .min(1)
      .refine((supplierIds) => new Set(supplierIds).size === supplierIds.length, {
        message: "Supplier IDs must be unique",
      }),
  })
  .openapi("ReplaceSupplySuppliers");

export const supplyIdParamsSchema = z.object({
  supplyId: z.uuid().openapi({ param: { name: "supplyId", in: "path" } }),
});
