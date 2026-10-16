import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { CreateSupplierCommand } from "../../application/dto/create-supplier-command.js";
import type { SupplierOutput } from "../../application/dto/supplier-output.js";
import { errorSchema } from "@/shared/presentation/http/contracts.js";
import {
  createSupplierSchema,
  supplierIdParamsSchema,
  supplierSchema,
} from "./suppliers.contract.js";

const listSuppliersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Suppliers"],
  summary: "List suppliers",
  responses: {
    200: {
      description: "Suppliers",
      content: { "application/json": { schema: z.object({ data: z.array(supplierSchema) }) } },
    },
  },
});

const getSupplierRoute = createRoute({
  method: "get",
  path: "/{supplierId}",
  tags: ["Suppliers"],
  summary: "Get a supplier",
  request: { params: supplierIdParamsSchema },
  responses: {
    200: {
      description: "Supplier",
      content: { "application/json": { schema: z.object({ data: supplierSchema }) } },
    },
    400: {
      description: "Invalid supplier ID",
      content: { "application/json": { schema: errorSchema } },
    },
    404: {
      description: "Supplier not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const createSupplierRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Suppliers"],
  summary: "Create a supplier",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createSupplierSchema } },
    },
  },
  responses: {
    201: {
      description: "Supplier created",
      content: { "application/json": { schema: z.object({ data: supplierSchema }) } },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: errorSchema } },
    },
    409: {
      description: "Supplier name already exists",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export interface ListSuppliersUseCase {
  execute(): Promise<SupplierOutput[]>;
}

export interface GetSupplierUseCase {
  execute(supplierId: string): Promise<SupplierOutput>;
}

export interface CreateSupplierUseCase {
  execute(command: CreateSupplierCommand): Promise<SupplierOutput>;
}

export function createSuppliersRoutes(
  listSuppliers: ListSuppliersUseCase,
  getSupplier: GetSupplierUseCase,
  createSupplier: CreateSupplierUseCase,
) {
  const routes = new OpenAPIHono({
    defaultHook: (result, context) => {
      if (!result.success) {
        return context.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request" } },
          400,
        );
      }
    },
  });

  routes.openapi(listSuppliersRoute, async (context) => {
    const suppliers = await listSuppliers.execute();
    return context.json({ data: suppliers }, 200);
  });

  routes.openapi(getSupplierRoute, async (context) => {
    const supplier = await getSupplier.execute(context.req.valid("param").supplierId);
    return context.json({ data: supplier }, 200);
  });

  routes.openapi(createSupplierRoute, async (context) => {
    const supplier = await createSupplier.execute(context.req.valid("json"));
    return context.json({ data: supplier }, 201);
  });

  return routes;
}
