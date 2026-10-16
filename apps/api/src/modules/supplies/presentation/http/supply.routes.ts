import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type {
  CreateSupplyInput,
  CreateSupplyOutput,
} from "../../application/dto/create-supply.dto.js";
import type { ListSuppliesOutput } from "../../application/dto/list-supplies.dto.js";
import type {
  ReplaceSupplySuppliersInput,
  ReplaceSupplySuppliersOutput,
} from "../../application/dto/replace-supply-suppliers.dto.js";
import { errorSchema } from "@/shared/presentation/http/contracts.js";
import {
  createSupplySchema,
  replaceSupplySuppliersSchema,
  supplyIdParamsSchema,
  supplySchema,
} from "./supply.contract.js";
import { toSupplyResponse } from "./supply.mapper.js";

const listSuppliesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Supplies"],
  summary: "List supplies",
  responses: {
    200: {
      description: "Supplies",
      content: { "application/json": { schema: z.object({ data: z.array(supplySchema) }) } },
    },
  },
});

const createSupplyRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Supplies"],
  summary: "Create a supply",
  request: {
    body: { required: true, content: { "application/json": { schema: createSupplySchema } } },
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
});

const replaceSupplySuppliersRoute = createRoute({
  method: "put",
  path: "/{supplyId}/suppliers",
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
});

interface SupplyUseCases {
  list: { execute(): Promise<ListSuppliesOutput> };
  create: { execute(input: CreateSupplyInput): Promise<CreateSupplyOutput> };
  replaceSuppliers: {
    execute(input: ReplaceSupplySuppliersInput): Promise<ReplaceSupplySuppliersOutput>;
  };
}

export function createSupplyRoutes(useCases: SupplyUseCases) {
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

  routes.openapi(listSuppliesRoute, async (context) => {
    const supplies = await useCases.list.execute();
    return context.json({ data: supplies.map(toSupplyResponse) }, 200);
  });

  routes.openapi(createSupplyRoute, async (context) => {
    const supply = await useCases.create.execute(context.req.valid("json"));
    return context.json({ data: toSupplyResponse(supply) }, 201);
  });

  routes.openapi(replaceSupplySuppliersRoute, async (context) => {
    const { supplyId } = context.req.valid("param");
    const { supplierIds } = context.req.valid("json");
    const supply = await useCases.replaceSuppliers.execute({ supplyId, supplierIds });
    return context.json({ data: toSupplyResponse(supply) }, 200);
  });

  return routes;
}
