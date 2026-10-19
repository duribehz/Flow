import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { createSupplierDto } from "./suppliers.dto.js";
import { supplierIdParamsDto } from "./suppliers.dto.js";
import { supplierDto } from "./suppliers.dto.js";
import { createSupplierUseCase } from "./use-cases/create-supplier.usecase.js";
import { getSupplierUseCase } from "./use-cases/get-supplier.usecase.js";
import { getSuppliersUseCase } from "./use-cases/get-suppliers.usecase.js";

export const suppliersRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

suppliersRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getSuppliers",
    tags: ["Suppliers"],
    summary: "List suppliers",
    responses: {
      200: {
        description: "Suppliers",
        content: { "application/json": { schema: z.object({ data: z.array(supplierDto) }) } },
      },
    },
  }),
  async (ctx) => {
    const suppliers = await getSuppliersUseCase(ctx.get("db"));
    return ctx.json({ data: suppliers }, 200);
  },
);

suppliersRouter.openapi(
  createRoute({
    method: "get",
    path: "/{supplierId}",
    operationId: "getSuppliersSupplierId",
    tags: ["Suppliers"],
    summary: "Get a supplier",
    request: { params: supplierIdParamsDto },
    responses: {
      200: {
        description: "Supplier",
        content: { "application/json": { schema: z.object({ data: supplierDto }) } },
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
  }),
  async (ctx) => {
    const { supplierId } = ctx.req.valid("param");
    const supplier = await getSupplierUseCase(supplierId, ctx.get("db"));
    return ctx.json({ data: supplier }, 200);
  },
);

suppliersRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postSuppliers",
    tags: ["Suppliers"],
    summary: "Create a supplier",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createSupplierDto } },
      },
    },
    responses: {
      201: {
        description: "Supplier created",
        content: { "application/json": { schema: z.object({ data: supplierDto }) } },
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
  }),
  async (ctx) => {
    const input = ctx.req.valid("json");
    const supplier = await createSupplierUseCase(input, ctx.get("db"));
    return ctx.json({ data: supplier }, 201);
  },
);
