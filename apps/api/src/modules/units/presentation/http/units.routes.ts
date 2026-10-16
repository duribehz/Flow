import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { CreateUnitCommand } from "../../application/dto/create-unit-command.js";
import type { UnitOutput } from "../../application/dto/unit-output.js";
import { errorSchema } from "@/shared/presentation/http/contracts.js";
import { createUnitSchema, unitIdParamsSchema, unitSchema } from "./units.contract.js";
import { toUnitResponse } from "./unit-response.mapper.js";

const listUnitsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Units"],
  summary: "List units",
  responses: {
    200: {
      description: "Units",
      content: { "application/json": { schema: z.object({ data: z.array(unitSchema) }) } },
    },
  },
});

const getUnitRoute = createRoute({
  method: "get",
  path: "/{unitId}",
  tags: ["Units"],
  summary: "Get a unit",
  request: { params: unitIdParamsSchema },
  responses: {
    200: {
      description: "Unit",
      content: { "application/json": { schema: z.object({ data: unitSchema }) } },
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
});

const createUnitRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Units"],
  summary: "Create a unit",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createUnitSchema } },
    },
  },
  responses: {
    201: {
      description: "Unit created",
      content: { "application/json": { schema: z.object({ data: unitSchema }) } },
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
});

export interface ListUnitsUseCase {
  execute(): Promise<UnitOutput[]>;
}

export interface GetUnitUseCase {
  execute(unitId: string): Promise<UnitOutput>;
}

export interface CreateUnitUseCase {
  execute(command: CreateUnitCommand): Promise<UnitOutput>;
}

export function createUnitsRoutes(
  listUnits: ListUnitsUseCase,
  getUnit: GetUnitUseCase,
  createUnit: CreateUnitUseCase,
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

  routes.openapi(listUnitsRoute, async (context) => {
    const units = await listUnits.execute();
    return context.json({ data: units.map(toUnitResponse) }, 200);
  });

  routes.openapi(getUnitRoute, async (context) => {
    const unit = await getUnit.execute(context.req.valid("param").unitId);
    return context.json({ data: toUnitResponse(unit) }, 200);
  });

  routes.openapi(createUnitRoute, async (context) => {
    const unit = await createUnit.execute(context.req.valid("json"));
    return context.json({ data: toUnitResponse(unit) }, 201);
  });

  return routes;
}
