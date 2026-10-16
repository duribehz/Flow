import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { GetReplenishmentDetailOutput } from "../../application/dto/get-replenishment-detail.output.js";
import type { ListSubmittedReplenishmentsOutput } from "../../application/dto/list-submitted-replenishments.output.js";
import {
  replenishmentDetailSchema,
  replenishmentErrorSchema,
  replenishmentIdParamsSchema,
  submittedReplenishmentSchema,
} from "./replenishment.contract.js";
import {
  toReplenishmentDetailResponse,
  toSubmittedReplenishmentResponse,
} from "./replenishment.mapper.js";

const listSubmittedRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Replenishments"],
  summary: "List submitted replenishment requests",
  responses: {
    200: {
      description: "Submitted replenishment requests",
      content: {
        "application/json": {
          schema: z.object({ data: z.array(submittedReplenishmentSchema) }),
        },
      },
    },
  },
});

const getReplenishmentRoute = createRoute({
  method: "get",
  path: "/{replenishmentId}",
  tags: ["Replenishments"],
  summary: "Get a replenishment request",
  request: {
    params: replenishmentIdParamsSchema,
  },
  responses: {
    200: {
      description: "Replenishment request detail",
      content: {
        "application/json": {
          schema: z.object({ data: replenishmentDetailSchema }),
        },
      },
    },
    400: {
      description: "Invalid replenishment request ID",
      content: { "application/json": { schema: replenishmentErrorSchema } },
    },
    404: {
      description: "Replenishment request not found",
      content: { "application/json": { schema: replenishmentErrorSchema } },
    },
  },
});

interface ReplenishmentRouteDependencies {
  listSubmitted: { execute(): Promise<ListSubmittedReplenishmentsOutput> };
  getDetail: { execute(replenishmentId: string): Promise<GetReplenishmentDetailOutput> };
}

export function createReplenishmentRoutes(dependencies: ReplenishmentRouteDependencies) {
  const routes = new OpenAPIHono({
    defaultHook: (result, context) => {
      if (!result.success) {
        return context.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid request parameters" } },
          400,
        );
      }
    },
  });

  routes.openapi(listSubmittedRoute, async (context) => {
    const replenishments = await dependencies.listSubmitted.execute();

    return context.json({ data: replenishments.map(toSubmittedReplenishmentResponse) }, 200);
  });

  routes.openapi(getReplenishmentRoute, async (context) => {
    const { replenishmentId } = context.req.valid("param");
    const replenishment = await dependencies.getDetail.execute(replenishmentId);

    return context.json({ data: toReplenishmentDetailResponse(replenishment) }, 200);
  });

  return routes;
}
