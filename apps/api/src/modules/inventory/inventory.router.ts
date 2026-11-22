import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { assertBranchAccess } from "@/shared/infrastructure/http/auth-middleware.js";
import {
  createInventoryCountDTO,
  createInventoryDayDTO,
  inventoryCountDetailDTO,
  inventoryCountDTO,
  inventoryCountIdParamsDTO,
  inventoryDayDTO,
  inventoryDayIdParamsDTO,
  inventoryLastReportDTO,
  inventoryLastReportsQueryDTO,
  inventorySupplyDTO,
  listInventoryCountsQueryDTO,
  listInventoryDaysQueryDTO,
  updateInventoryCountDTO,
} from "./inventory.dto.js";
import { InventoryRepo, type InventoryCount, type InventoryDay } from "./inventory.repo.js";
import { createInventoryCountUseCase } from "./use-cases/create-inventory-count.usecase.js";
import { getInventoryCountUseCase } from "./use-cases/get-inventory-count.usecase.js";
import { getInventoryDayUseCase } from "./use-cases/get-inventory-day.usecase.js";
import { listInventoryCountsUseCase } from "./use-cases/list-inventory-counts.usecase.js";
import { listInventoryDaysUseCase } from "./use-cases/list-inventory-days.usecase.js";
import { openInventoryDayUseCase } from "./use-cases/open-inventory-day.usecase.js";
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
    path: "/inventory/supplies",
    operationId: "getInventorySupplies",
    tags: ["Inventory"],
    summary: "List article details needed for inventory counts",
    responses: {
      200: {
        description: "Inventory article catalog",
        content: {
          "application/json": { schema: z.object({ data: z.array(inventorySupplyDTO) }) },
        },
      },
    },
  }),
  async (context) => {
    const supplies = await new InventoryRepo(context.get("db")).listInventorySupplies();
    return context.json({ data: supplies }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory/last-reports",
    operationId: "getInventoryLastReports",
    tags: ["Inventory"],
    summary: "Last reported stock per article for a branch",
    request: { query: inventoryLastReportsQueryDTO },
    responses: {
      200: {
        description: "Last reported stock per article",
        content: {
          "application/json": { schema: z.object({ data: z.array(inventoryLastReportDTO) }) },
        },
      },
      400: errors[400],
    },
  }),
  async (ctx) => {
    const query = ctx.req.valid("query");
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), query.branchId);
    const rows = await new InventoryRepo(ctx.get("db")).listLastReports(query.branchId);
    return ctx.json({ data: rows }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-days",
    operationId: "postInventoryDays",
    tags: ["Inventory"],
    summary: "Open or get an operational day",
    request: {
      body: { required: true, content: { "application/json": { schema: createInventoryDayDTO } } },
    },
    responses: {
      200: {
        description: "Existing operational day returned",
        content: { "application/json": { schema: z.object({ data: inventoryDayDTO }) } },
      },
      201: {
        description: "Operational day opened",
        content: { "application/json": { schema: z.object({ data: inventoryDayDTO }) } },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (ctx) => {
    const input = ctx.req.valid("json");
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), input.branchId);
    const result = await openInventoryDayUseCase(ctx.get("userId"), input, ctx.get("db"));
    return ctx.json({ data: toDayResponse(result.day) }, result.created ? 201 : 200);
  },
);

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
    const filters = ctx.req.valid("query");
    const scopedFilters =
      ctx.get("userRole") === "manager" ? { ...filters, branchId: ctx.get("branchId")! } : filters;
    const days = await listInventoryDaysUseCase(scopedFilters, ctx.get("db"));
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
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), day.branchId);
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
    const input = ctx.req.valid("json");
    const day = await getInventoryDayUseCase(input.inventoryDayId, ctx.get("db"));
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), day.branchId);
    const count = await createInventoryCountUseCase(ctx.get("userId"), input, ctx.get("db"));
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
    const filters = ctx.req.valid("query");
    const scopedFilters =
      ctx.get("userRole") === "manager" ? { ...filters, branchId: ctx.get("branchId")! } : filters;
    const counts = await listInventoryCountsUseCase(scopedFilters, ctx.get("db"));
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
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), count.branchId);
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
    const countId = ctx.req.valid("param").countId;
    const current = await getInventoryCountUseCase(countId, ctx.get("db"));
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), current.branchId);
    const count = await updateInventoryCountUseCase(countId, ctx.req.valid("json"), ctx.get("db"));
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
    const countId = ctx.req.valid("param").countId;
    const current = await getInventoryCountUseCase(countId, ctx.get("db"));
    assertBranchAccess(ctx.get("userRole"), ctx.get("branchId"), current.branchId);
    const count = await submitInventoryCountUseCase(ctx.get("userId"), countId, ctx.get("db"));
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
