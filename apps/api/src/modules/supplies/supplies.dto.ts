import { z } from "@hono/zod-openapi";

export const createSupplyInputSchema = z.object({
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
});

export type CreateSupplyInput = z.infer<typeof createSupplyInputSchema>;
