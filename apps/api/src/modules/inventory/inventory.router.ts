import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  createInventoryCountDTO,
  inventoryCountDetailDTO,
  inventoryCountDTO,
  inventoryCountIdParamsDTO,
  inventoryDayDTO,
  inventoryDayIdParamsDTO,
  listInventoryCountsQueryDTO,
  listInventoryDaysQueryDTO,
  updateInventoryCountDTO,
} from "./inventory.dto.js";
import type { InventoryCount, InventoryDay } from "./inventory.repo.js";
import { createInventoryCountUseCase } from "./use-cases/create-inventory-count.usecase.js";
import { getInventoryCountUseCase } from "./use-cases/get-inventory-count.usecase.js";
import { getInventoryDayUseCase } from "./use-cases/get-inventory-day.usecase.js";
import { listInventoryCountsUseCase } from "./use-cases/list-inventory-counts.usecase.js";
import { listInventoryDaysUseCase } from "./use-cases/list-inventory-days.usecase.js";
import { reviewInventoryCountUseCase } from "./use-cases/review-inventory-count.usecase.js";
import { submitInventoryCountUseCase } from "./use-cases/submit-inventory-count.usecase.js";
import { updateInventoryCountUseCase } from "./use-cases/update-inventory-count.usecase.js";

const errors = {
  400: {
    description: "Invalid request",
    content: { "application/json": { schema: errorSchema } },
  },
  404: {
    description: "Inventory resource not found",
    content: { "application/json": { schema: errorSchema } },
  },
  409: {
    description: "Inventory state conflict",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

export const inventoryRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-days",
    operationId: "getInventoryDays",
    tags: ["Inventory"],
    summary: "List inventory days",
    request: { query: listInventoryDaysQueryDTO },
    responses: {
      200: {
        description: "Inventory days",
        content: { "application/json": { schema: z.object({ data: z.array(inventoryDayDTO) }) } },
      },
      400: errors[400],
    },
  }),
  async (ctx) => {
    const days = await listInventoryDaysUseCase(ctx.req.valid("query"), ctx.get("db"));
    return ctx.json({ data: days.map(toDayResponse) }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-days/{dayId}",
    operationId: "getInventoryDaysDayId",
    tags: ["Inventory"],
    summary: "Get an inventory day",
    request: { params: inventoryDayIdParamsDTO },
    responses: {
      200: {
        description: "Inventory day",
        content: { "application/json": { schema: z.object({ data: inventoryDayDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (ctx) => {
    const day = await getInventoryDayUseCase(ctx.req.valid("param").dayId, ctx.get("db"));
    return ctx.json({ data: toDayResponse(day) }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-counts",
    operationId: "postInventoryCounts",
    tags: ["Inventory"],
    summary: "Create a draft inventory count",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createInventoryCountDTO } },
      },
    },
    responses: {
      201: {
        description: "Inventory count created",
        content: {
          "application/json": { schema: z.object({ data: inventoryCountDetailDTO }) },
        },
      },
      400: errors[400],
      409: errors[409],
    },
  }),
  async (ctx) => {
    const count = await createInventoryCountUseCase(
      ctx.get("userId"),
      ctx.req.valid("json"),
      ctx.get("db"),
    );
    return ctx.json({ data: toCountResponse(count) }, 201);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-counts",
    operationId: "getInventoryCounts",
    tags: ["Inventory"],
    summary: "List inventory counts",
    request: { query: listInventoryCountsQueryDTO },
    responses: {
      200: {
        description: "Inventory counts",
        content: {
          "application/json": { schema: z.object({ data: z.array(inventoryCountDTO) }) },
        },
      },
      400: errors[400],
    },
  }),
  async (ctx) => {
    const counts = await listInventoryCountsUseCase(ctx.req.valid("query"), ctx.get("db"));
    return ctx.json({ data: counts.map(toCountSummaryResponse) }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-counts/{countId}",
    operationId: "getInventoryCountsCountId",
    tags: ["Inventory"],
    summary: "Get an inventory count",
    request: { params: inventoryCountIdParamsDTO },
    responses: {
      200: {
        description: "Inventory count",
        content: {
          "application/json": { schema: z.object({ data: inventoryCountDetailDTO }) },
        },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (ctx) => {
    const count = await getInventoryCountUseCase(ctx.req.valid("param").countId, ctx.get("db"));
    return ctx.json({ data: toCountResponse(count) }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "patch",
    path: "/inventory-counts/{countId}",
    operationId: "patchInventoryCountsCountId",
    tags: ["Inventory"],
    summary: "Update a draft inventory count",
    request: {
      params: inventoryCountIdParamsDTO,
      body: {
        required: true,
        content: { "application/json": { schema: updateInventoryCountDTO } },
      },
    },
    responses: {
      200: {
        description: "Inventory count updated",
        content: {
          "application/json": { schema: z.object({ data: inventoryCountDetailDTO }) },
        },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (ctx) => {
    const count = await updateInventoryCountUseCase(
      ctx.req.valid("param").countId,
      ctx.req.valid("json"),
      ctx.get("db"),
    );
    return ctx.json({ data: toCountResponse(count) }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-counts/{countId}/submit",
    operationId: "postInventoryCountsCountIdSubmit",
    tags: ["Inventory"],
    summary: "Submit an inventory count and close its day",
    request: { params: inventoryCountIdParamsDTO },
    responses: {
      200: {
        description: "Inventory count submitted",
        content: {
          "application/json": { schema: z.object({ data: inventoryCountDetailDTO }) },
        },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (ctx) => {
    const count = await submitInventoryCountUseCase(
      ctx.get("userId"),
      ctx.req.valid("param").countId,
      ctx.get("db"),
    );
    return ctx.json({ data: toCountResponse(count) }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-counts/{countId}/review",
    operationId: "postInventoryCountsCountIdReview",
    tags: ["Inventory"],
    summary: "Review a submitted inventory count",
    request: { params: inventoryCountIdParamsDTO },
    responses: {
      200: {
        description: "Inventory count reviewed",
        content: {
          "application/json": { schema: z.object({ data: inventoryCountDetailDTO }) },
        },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (ctx) => {
    const count = await reviewInventoryCountUseCase(
      ctx.get("userId"),
      ctx.req.valid("param").countId,
      ctx.get("db"),
    );
    return ctx.json({ data: toCountResponse(count) }, 200);
  },
);

function toDayResponse(day: InventoryDay) {
  return {
    ...day,
    openedAt: day.openedAt.toISOString(),
    closedAt: day.closedAt?.toISOString() ?? null,
    createdAt: day.createdAt.toISOString(),
  };
}

function toCountSummaryResponse(count: Omit<InventoryCount, "items">) {
  return {
    ...count,
    submittedAt: count.submittedAt?.toISOString() ?? null,
    reviewedAt: count.reviewedAt?.toISOString() ?? null,
    createdAt: count.createdAt.toISOString(),
  };
}

function toCountResponse(count: InventoryCount) {
  return {
    ...toCountSummaryResponse(count),
    items: count.items.map((item) => ({
      ...item,
      lastCountedAt: item.lastCountedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
