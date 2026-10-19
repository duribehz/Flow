import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { createSupplySchema } from "./supplies.dto.js";
import { replaceSupplySuppliersSchema } from "./supplies.dto.js";
import { supplyIdParamsSchema, supplySchema } from "./supplies.dto.js";
import type { Supply } from "./supplies.repo.js";
import { createSupplyUseCase } from "./use-cases/create-supply.usecase.js";
import { getSuppliesUseCase } from "./use-cases/get-supplies.usecase.js";
import { replaceSupplySuppliersUseCase } from "./use-cases/replace-supply-suppliers.usecase.js";

export const suppliesRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

suppliesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getSupplies",
    tags: ["Supplies"],
    summary: "List supplies",
    responses: {
      200: {
        description: "Supplies",
        content: { "application/json": { schema: z.object({ data: z.array(supplySchema) }) } },
      },
    },
  }),
  async (ctx) => {
    const supplies = await getSuppliesUseCase(ctx.get("db"));
    return ctx.json({ data: supplies.map(toSupplyResponse) }, 200);
  },
);

suppliesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postSupplies",
    tags: ["Supplies"],
    summary: "Create a supply",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createSupplySchema } },
      },
    },
    responses: {
      201: {
        description: "Supply created",
        content: { "application/json": { schema: z.object({ data: supplySchema }) } },
      },
      400: {
        description: "Invalid request body",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Category, active unit, or supplier not found",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "Supply SKU already exists",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const supply = await createSupplyUseCase(ctx.req.valid("json"), ctx.get("db"));
    return ctx.json({ data: toSupplyResponse(supply) }, 201);
  },
);

suppliesRouter.openapi(
  createRoute({
    method: "put",
    path: "/{supplyId}/suppliers",
    operationId: "putSuppliesSupplyIdSuppliers",
    tags: ["Supplies"],
    summary: "Replace a supply's suppliers",
    request: {
      params: supplyIdParamsSchema,
      body: {
        required: true,
        content: { "application/json": { schema: replaceSupplySuppliersSchema } },
      },
    },
    responses: {
      200: {
        description: "Supply suppliers replaced",
        content: { "application/json": { schema: z.object({ data: supplySchema }) } },
      },
      400: {
        description: "Invalid supply ID or request body",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Supply or supplier not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { supplyId } = ctx.req.valid("param");
    const { supplierIds } = ctx.req.valid("json");
    const supply = await replaceSupplySuppliersUseCase(supplyId, supplierIds, ctx.get("db"));
    return ctx.json({ data: toSupplyResponse(supply) }, 200);
  },
);

function toSupplyResponse(supply: Supply) {
  return {
    ...supply,
    createdAt: supply.createdAt.toISOString(),
    updatedAt: supply.updatedAt.toISOString(),
  };
}
