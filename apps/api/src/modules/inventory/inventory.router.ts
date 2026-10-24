import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  closeInventoryShiftDTO,
  closeShiftResultDto,
  createInventoryShiftDTO,
  inventoryClosureDetailDto,
  inventoryClosureIdParamsDTO,
  inventoryClosureDto,
  inventoryClosureReportDto,
  inventoryReceiptDto,
  inventoryShiftDto,
  inventoryShiftIdParamsDTO,
  listInventoryClosuresQueryDTO,
  listInventoryShiftsQueryDTO,
  recordInventoryReceiptDTO,
} from "./inventory.dto.js";
import { closeShiftUseCase } from "./use-cases/close-shift.usecase.js";
import { createShiftUseCase } from "./use-cases/create-shift.usecase.js";
import { getClosureReportUseCase } from "./use-cases/get-closure-report.usecase.js";
import { getInventoryClosureUseCase, listInventoryClosuresUseCase } from "./use-cases/list-closures.usecase.js";
import { getShiftUseCase, listShiftsUseCase } from "./use-cases/list-shifts.usecase.js";
import { recordReceiptUseCase } from "./use-cases/record-receipt.usecase.js";

export const inventoryRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-shifts",
    operationId: "postInventoryShifts",
    tags: ["Inventory"],
    summary: "Open an inventory shift",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createInventoryShiftDTO } },
      },
    },
    responses: {
      201: {
        description: "Shift opened",
        content: { "application/json": { schema: z.object({ data: inventoryShiftDto }) } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "A shift already exists for this branch, date and shift name",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const actorId = ctx.get("userId");
    const shift = await createShiftUseCase(actorId, ctx.req.valid("json"), ctx.get("db"));
    return ctx.json({ data: shift }, 201);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-shifts",
    operationId: "getInventoryShifts",
    tags: ["Inventory"],
    summary: "List inventory shifts",
    request: { query: listInventoryShiftsQueryDTO },
    responses: {
      200: {
        description: "Inventory shifts",
        content: { "application/json": { schema: z.object({ data: z.array(inventoryShiftDto) }) } },
      },
      400: {
        description: "Invalid query",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const query = ctx.req.valid("query");
    const shifts = await listShiftsUseCase(query, ctx.get("db"));
    return ctx.json({ data: shifts }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-shifts/{shiftId}",
    operationId: "getInventoryShiftsShiftId",
    tags: ["Inventory"],
    summary: "Get an inventory shift by id",
    request: { params: inventoryShiftIdParamsDTO },
    responses: {
      200: {
        description: "Inventory shift",
        content: { "application/json": { schema: z.object({ data: inventoryShiftDto }) } },
      },
      400: {
        description: "Invalid shift id",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Shift not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { shiftId } = ctx.req.valid("param");
    const shift = await getShiftUseCase(shiftId, ctx.get("db"));
    return ctx.json({ data: shift }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-shifts/{shiftId}/receipts",
    operationId: "postInventoryShiftsShiftIdReceipts",
    tags: ["Inventory"],
    summary: "Record a supply receipt for an open shift",
    request: {
      params: inventoryShiftIdParamsDTO,
      body: {
        required: true,
        content: { "application/json": { schema: recordInventoryReceiptDTO } },
      },
    },
    responses: {
      201: {
        description: "Receipt recorded",
        content: { "application/json": { schema: z.object({ data: inventoryReceiptDto }) } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Shift not found",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "Shift is closed",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { shiftId } = ctx.req.valid("param");
    const actorId = ctx.get("userId");
    const receipt = await recordReceiptUseCase(
      actorId,
      shiftId,
      ctx.req.valid("json"),
      ctx.get("db"),
    );
    return ctx.json({ data: receipt }, 201);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-closures",
    operationId: "getInventoryClosures",
    tags: ["Inventory"],
    summary: "List inventory closures",
    request: { query: listInventoryClosuresQueryDTO },
    responses: {
      200: {
        description: "Inventory closures",
        content: {
          "application/json": { schema: z.object({ data: z.array(inventoryClosureDto) }) },
        },
      },
      400: {
        description: "Invalid query",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const query = ctx.req.valid("query");
    const closures = await listInventoryClosuresUseCase(query, ctx.get("db"));
    return ctx.json({ data: closures }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-closures/{closureId}",
    operationId: "getInventoryClosuresClosureId",
    tags: ["Inventory"],
    summary: "Get an inventory closure by id with its items",
    request: { params: inventoryClosureIdParamsDTO },
    responses: {
      200: {
        description: "Inventory closure with items",
        content: {
          "application/json": { schema: z.object({ data: inventoryClosureDetailDto }) },
        },
      },
      400: {
        description: "Invalid closure id",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Closure not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { closureId } = ctx.req.valid("param");
    const { closure, items } = await getInventoryClosureUseCase(closureId, ctx.get("db"));
    return ctx.json({ data: { ...closure, items } }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "get",
    path: "/inventory-closures/{closureId}/report",
    operationId: "getInventoryClosuresClosureIdReport",
    tags: ["Inventory"],
    summary: "Get the closure report viewed by the admin",
    request: { params: inventoryClosureIdParamsDTO },
    responses: {
      200: {
        description: "Closure report",
        content: {
          "application/json": { schema: z.object({ data: inventoryClosureReportDto }) },
        },
      },
      400: {
        description: "Invalid closure id",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Closure not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { closureId } = ctx.req.valid("param");
    const report = await getClosureReportUseCase(closureId, ctx.get("db"));
    return ctx.json({ data: report }, 200);
  },
);

inventoryRouter.openapi(
  createRoute({
    method: "post",
    path: "/inventory-shifts/{shiftId}/close",
    operationId: "postInventoryShiftsShiftIdClose",
    tags: ["Inventory"],
    summary: "Close a shift and generate a replenishment request automatically",
    request: {
      params: inventoryShiftIdParamsDTO,
      body: {
        required: true,
        content: { "application/json": { schema: closeInventoryShiftDTO } },
      },
    },
    responses: {
      201: {
        description: "Shift closed",
        content: { "application/json": { schema: z.object({ data: closeShiftResultDto }) } },
      },
      400: {
        description: "Invalid request",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Shift not found",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "Shift already closed",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { shiftId } = ctx.req.valid("param");
    const actorId = ctx.get("userId");
    const result = await closeShiftUseCase(
      actorId,
      shiftId,
      ctx.req.valid("json"),
      ctx.get("db"),
    );
    return ctx.json({ data: result }, 201);
  },
);
