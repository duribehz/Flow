import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/http/contracts.js";
import {
  createSupplierSchema,
  supplierIdParamsSchema,
  supplierSchema,
} from "./suppliers.contract.js";
import type { SuppliersUseCase } from "./suppliers.usecase.js";

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

type SuppliersService = Pick<
  SuppliersUseCase,
  "getSuppliers" | "getSupplierById" | "createSupplier"
>;

export function createSuppliersRoutes(useCase: SuppliersService) {
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
    const suppliers = await useCase.getSuppliers();
    return context.json({ data: suppliers }, 200);
  });

  routes.openapi(getSupplierRoute, async (context) => {
    const { supplierId } = context.req.valid("param");
    const supplier = await useCase.getSupplierById(supplierId);
    return context.json({ data: supplier }, 200);
  });

  routes.openapi(createSupplierRoute, async (context) => {
    const input = context.req.valid("json");
    const supplier = await useCase.createSupplier(input);
    return context.json({ data: supplier }, 201);
  });

  return routes;
}
