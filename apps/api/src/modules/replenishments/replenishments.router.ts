import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  addReplenishmentItemDto,
  draftReplenishmentDto,
  replenishmentDto,
  replenishmentIdParamsDto,
  replenishmentItemParamsDto,
  submittedReplenishmentDto,
  updateReplenishmentItemDto,
  updateReplenishmentNotesDto,
} from "./replenishments.dto.js";
import { addReplenishmentItemUseCase } from "./use-cases/add-replenishment-item.usecase.js";
import { deleteReplenishmentItemUseCase } from "./use-cases/delete-replenishment-item.usecase.js";
import { getReplenishmentUseCase } from "./use-cases/get-replenishment.usecase.js";
import { getDraftReplenishmentsUseCase } from "./use-cases/get-draft-replenishments.usecase.js";
import { getSubmittedReplenishmentsUseCase } from "./use-cases/get-submitted-replenishments.usecase.js";
import { submitReplenishmentUseCase } from "./use-cases/submit-replenishment.usecase.js";
import { updateReplenishmentItemUseCase } from "./use-cases/update-replenishment-item.usecase.js";
import { updateReplenishmentNotesUseCase } from "./use-cases/update-replenishment-notes.usecase.js";

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

const mutationResponses = {
  400: {
    description: "Invalid replenishment data or state",
    content: { "application/json": { schema: errorSchema } },
  },
  404: {
    description: "Replenishment, item, supply or usage purpose not found",
    content: { "application/json": { schema: errorSchema } },
  },
  409: {
    description: "Replenishment is no longer a draft",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

replenishmentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/drafts",
    operationId: "getDraftReplenishments",
    tags: ["Replenishments"],
    summary: "List draft replenishment requests",
    responses: {
      200: {
        description: "Draft replenishment requests",
        content: {
          "application/json": { schema: z.object({ data: z.array(draftReplenishmentDto) }) },
        },
      },
    },
  }),
  async (context) => {
    const replenishments = await getDraftReplenishmentsUseCase(context.get("db"));
    return context.json(
      {
        data: replenishments.map((replenishment) => ({
          ...replenishment,
          createdAt: replenishment.createdAt.toISOString(),
          updatedAt: replenishment.updatedAt.toISOString(),
        })),
      },
      200,
    );
  },
);

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
          "application/json": { schema: z.object({ data: z.array(submittedReplenishmentDto) }) },
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
    request: { params: replenishmentIdParamsDto },
    responses: {
      200: {
        description: "Replenishment request detail",
        content: { "application/json": { schema: z.object({ data: replenishmentDto }) } },
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
    const replenishment = await getReplenishmentUseCase(
      context.req.valid("param").replenishmentId,
      context.get("db"),
    );
    return context.json({ data: serializeDetail(replenishment) }, 200);
  },
);

replenishmentsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{replenishmentId}",
    operationId: "patchReplenishmentsReplenishmentId",
    tags: ["Replenishments"],
    summary: "Update draft replenishment notes",
    request: {
      params: replenishmentIdParamsDto,
      body: {
        required: true,
        content: { "application/json": { schema: updateReplenishmentNotesDto } },
      },
    },
    responses: {
      200: {
        description: "Replenishment updated",
        content: { "application/json": { schema: z.object({ data: replenishmentDto }) } },
      },
      ...mutationResponses,
    },
  }),
  async (context) => {
    const detail = await updateReplenishmentNotesUseCase(
      context.req.valid("param").replenishmentId,
      context.req.valid("json").notes,
      context.get("db"),
    );
    return context.json({ data: serializeDetail(detail) }, 200);
  },
);

replenishmentsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{replenishmentId}/items",
    operationId: "postReplenishmentsReplenishmentIdItems",
    tags: ["Replenishments"],
    summary: "Add a line to a draft replenishment",
    request: {
      params: replenishmentIdParamsDto,
      body: {
        required: true,
        content: { "application/json": { schema: addReplenishmentItemDto } },
      },
    },
    responses: {
      200: {
        description: "Replenishment line added",
        content: { "application/json": { schema: z.object({ data: replenishmentDto }) } },
      },
      ...mutationResponses,
    },
  }),
  async (context) => {
    const detail = await addReplenishmentItemUseCase(
      context.req.valid("param").replenishmentId,
      context.req.valid("json"),
      context.get("db"),
    );
    return context.json({ data: serializeDetail(detail) }, 200);
  },
);

replenishmentsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{replenishmentId}/items/{itemId}",
    operationId: "patchReplenishmentsReplenishmentIdItemsItemId",
    tags: ["Replenishments"],
    summary: "Update a draft replenishment line",
    request: {
      params: replenishmentItemParamsDto,
      body: {
        required: true,
        content: { "application/json": { schema: updateReplenishmentItemDto } },
      },
    },
    responses: {
      200: {
        description: "Replenishment line updated",
        content: { "application/json": { schema: z.object({ data: replenishmentDto }) } },
      },
      ...mutationResponses,
    },
  }),
  async (context) => {
    const { replenishmentId, itemId } = context.req.valid("param");
    const detail = await updateReplenishmentItemUseCase(
      replenishmentId,
      itemId,
      context.req.valid("json"),
      context.get("db"),
    );
    return context.json({ data: serializeDetail(detail) }, 200);
  },
);

replenishmentsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{replenishmentId}/items/{itemId}",
    operationId: "deleteReplenishmentsReplenishmentIdItemsItemId",
    tags: ["Replenishments"],
    summary: "Remove a line from a draft replenishment",
    request: { params: replenishmentItemParamsDto },
    responses: {
      200: {
        description: "Replenishment line removed",
        content: { "application/json": { schema: z.object({ data: replenishmentDto }) } },
      },
      ...mutationResponses,
    },
  }),
  async (context) => {
    const { replenishmentId, itemId } = context.req.valid("param");
    const detail = await deleteReplenishmentItemUseCase(replenishmentId, itemId, context.get("db"));
    return context.json({ data: serializeDetail(detail) }, 200);
  },
);

replenishmentsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{replenishmentId}/submit",
    operationId: "postReplenishmentsReplenishmentIdSubmit",
    tags: ["Replenishments"],
    summary: "Submit a replenishment request",
    request: { params: replenishmentIdParamsDto },
    responses: {
      200: {
        description: "Replenishment submitted",
        content: { "application/json": { schema: z.object({ data: replenishmentDto }) } },
      },
      ...mutationResponses,
    },
  }),
  async (context) => {
    const detail = await submitReplenishmentUseCase(
      context.req.valid("param").replenishmentId,
      context.get("db"),
    );
    return context.json({ data: serializeDetail(detail) }, 200);
  },
);

function serializeDetail(replenishment: Awaited<ReturnType<typeof getReplenishmentUseCase>>) {
  return {
    ...replenishment,
    submittedAt: replenishment.submittedAt?.toISOString() ?? null,
    reviewedAt: replenishment.reviewedAt?.toISOString() ?? null,
    createdAt: replenishment.createdAt.toISOString(),
    updatedAt: replenishment.updatedAt.toISOString(),
    items: replenishment.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
