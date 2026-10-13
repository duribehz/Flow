import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { ReplenishmentUseCase } from "./replenishment.usecase.js";
import {
  errorSchema,
  replenishmentDetailSchema,
  replenishmentIdParamsSchema,
  submittedReplenishmentSchema,
} from "./replenishments.contract.js";

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
      content: { "application/json": { schema: errorSchema } },
    },
    404: {
      description: "Replenishment request not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

type ReplenishmentReader = Pick<
  ReplenishmentUseCase,
  "getSubmittedReplenishments" | "getReplenishmentById"
>;

export function createReplenishmentsRoutes(useCase: ReplenishmentReader) {
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
    const replenishments = await useCase.getSubmittedReplenishments();

    return context.json(
      {
        data: replenishments.map((replenishment) => ({
          ...replenishment,
          submittedAt: replenishment.submittedAt?.toISOString() ?? null,
          createdAt: replenishment.createdAt.toISOString(),
        })),
      },
      200,
    );
  });

  routes.openapi(getReplenishmentRoute, async (context) => {
    const { replenishmentId } = context.req.valid("param");
    const replenishment = await useCase.getReplenishmentById(replenishmentId);

    return context.json(
      {
        data: {
          ...replenishment,
          submittedAt: replenishment.submittedAt?.toISOString() ?? null,
          reviewedAt: replenishment.reviewedAt?.toISOString() ?? null,
          createdAt: replenishment.createdAt.toISOString(),
          updatedAt: replenishment.updatedAt.toISOString(),
          items: replenishment.items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          })),
        },
      },
      200,
    );
  });

  return routes;
}
