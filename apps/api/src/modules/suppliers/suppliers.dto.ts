import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";

import { suppliers } from "./suppliers.schema.js";

export const createSupplierDto = z
  .object({
    name: z.string().trim().min(1).max(200),
    phoneNumber: z.string().trim().min(1).max(30).nullable().optional(),
    email: z.string().trim().toLowerCase().pipe(z.email()).nullable().optional(),
  })
  .openapi("CreateSupplier");

export const supplierDto = createSelectSchema(suppliers).openapi("Supplier");

export const supplierIdParamsDto = z.object({
  supplierId: z.uuid().openapi({ param: { name: "supplierId", in: "path" } }),
});
