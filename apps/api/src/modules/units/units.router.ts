import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { createUnitDtoSchema } from "./units.dto.js";
import { unitIdParamsSchema } from "./units.dto.js";
import { unitDtoSchema } from "./units.dto.js";
import type { Unit } from "./units.repo.js";
import { createUnitUseCase } from "./use-cases/create-unit.usecase.js";
import { getUnitUseCase } from "./use-cases/get-unit.usecase.js";
import { getUnitsUseCase } from "./use-cases/get-units.usecase.js";

export const unitsRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

unitsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getUnits",
    tags: ["Units"],
    summary: "List units",
    responses: {
      200: {
        description: "Units",
        content: {
          "application/json": { schema: z.object({ data: z.array(unitDtoSchema) }) },
        },
      },
    },
  }),
  async (ctx) => {
    const units = await getUnitsUseCase(ctx.get("db"));
    return ctx.json({ data: units.map(toUnitResponse) }, 200);
  },
);

unitsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{unitId}",
    operationId: "getUnitsUnitId",
    tags: ["Units"],
    summary: "Get a unit",
    request: { params: unitIdParamsSchema },
    responses: {
      200: {
        description: "Unit",
        content: { "application/json": { schema: z.object({ data: unitDtoSchema }) } },
      },
      400: {
        description: "Invalid unit ID",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Unit not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { unitId } = ctx.req.valid("param");
    const unit = await getUnitUseCase(unitId, ctx.get("db"));
    return ctx.json({ data: toUnitResponse(unit) }, 200);
  },
);

unitsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postUnits",
    tags: ["Units"],
    summary: "Create a unit",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createUnitDtoSchema } },
      },
    },
    responses: {
      201: {
        description: "Unit created",
        content: { "application/json": { schema: z.object({ data: unitDtoSchema }) } },
      },
      400: {
        description: "Invalid request body",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "Unit name or symbol already exists",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const input = ctx.req.valid("json");
    const unit = await createUnitUseCase(input, ctx.get("db"));
    return ctx.json({ data: toUnitResponse(unit) }, 201);
  },
);

function toUnitResponse(unit: Unit) {
  return {
    ...unit,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}
