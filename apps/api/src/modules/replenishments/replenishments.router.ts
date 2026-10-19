import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { replenishmentIdParamsDto } from "./replenishments.dto.js";
import { replenishmentDto } from "./replenishments.dto.js";
import { submittedReplenishmentDto } from "./replenishments.dto.js";
import { getReplenishmentUseCase } from "./use-cases/get-replenishment.usecase.js";
import { getSubmittedReplenishmentsUseCase } from "./use-cases/get-submitted-replenishments.usecase.js";

export const replenishmentsRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request parameters" } },
        400,
      );
    }
  },
});

replenishmentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getReplenishments",
    tags: ["Replenishments"],
    summary: "List submitted replenishment requests",
    responses: {
      200: {
        description: "Submitted replenishment requests",
        content: {
          "application/json": {
            schema: z.object({ data: z.array(submittedReplenishmentDto) }),
          },
        },
      },
    },
  }),
  async (context) => {
    const replenishments = await getSubmittedReplenishmentsUseCase(context.get("db"));

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
  },
);

replenishmentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{replenishmentId}",
    operationId: "getReplenishmentsReplenishmentId",
    tags: ["Replenishments"],
    summary: "Get a replenishment request",
    request: {
      params: replenishmentIdParamsDto,
    },
    responses: {
      200: {
        description: "Replenishment request detail",
        content: {
          "application/json": {
            schema: z.object({ data: replenishmentDto }),
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
  }),
  async (context) => {
    const { replenishmentId } = context.req.valid("param");
    const replenishment = await getReplenishmentUseCase(replenishmentId, context.get("db"));

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
  },
);
