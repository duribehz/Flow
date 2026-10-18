import { z } from "@hono/zod-openapi";

export const supplierSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    phoneNumber: z.string().nullable(),
    email: z.string().nullable(),
  })
  .openapi("Supplier");

export const createSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    phoneNumber: z.string().trim().min(1).max(30).nullable().optional(),
    email: z.string().trim().toLowerCase().pipe(z.email()).nullable().optional(),
  })
  .openapi("CreateSupplier");

export const supplierIdParamsSchema = z.object({
  supplierId: z.uuid().openapi({ param: { name: "supplierId", in: "path" } }),
});
