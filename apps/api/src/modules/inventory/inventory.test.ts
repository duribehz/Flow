import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import { devActorMiddleware } from "@/shared/infrastructure/http/dev-actor.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import type {
  CreateShiftInput,
  RecordReceiptInput,
} from "./inventory.repo.js";

const actorId = "00000000-0000-4000-8000-000000000001";
const branchId = "10000000-0000-4000-8000-000000000001";
const supplyId = "10000000-0000-4000-8000-000000000002";
const shiftId = "10000000-0000-4000-8000-000000000003";

const openedShift = {
  id: shiftId,
  branchId,
  businessDate: "2026-10-19",
  shiftName: "morning" as const,
  status: "open" as const,
  openedBy: actorId,
  closedBy: null,
  openedAt: new Date("2026-10-19T08:00:00Z").toISOString(),
  closedAt: null,
  notes: null,
  createdAt: new Date("2026-10-19T08:00:00Z").toISOString(),
};

const closedShift = { ...openedShift, status: "closed" as const };

let receivedActor: string | undefined;
let receivedShiftId: string | undefined;
let receivedReceipt: RecordReceiptInput | undefined;

const createShiftUseCase = mock(
  async (actor: string, input: CreateShiftInput, _db: Executor) => {
    receivedActor = actor;
    return { ...openedShift, ...input };
  },
);

const listShiftsUseCase = mock(async (_filters: unknown, _db: Executor) => [openedShift]);
const getShiftUseCase = mock(async (id: string, _db: Executor) => {
  if (id !== shiftId) {
    throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
  }
  return openedShift;
});

const recordReceiptUseCase = mock(
  async (actor: string, id: string, input: RecordReceiptInput, _db: Executor) => {
    receivedActor = actor;
    receivedShiftId = id;
    receivedReceipt = input;
    return {
      id: "10000000-0000-4000-8000-000000000010",
      inventoryShiftId: id,
      supplyId: input.supplyId,
      purchaseId: null,
      expectedQuantity: input.expectedQuantity ?? null,
      receivedQuantity: input.receivedQuantity,
      incidentType: input.incidentType ?? "none",
      notes: input.notes ?? null,
      receivedBy: actor,
      receivedAt: new Date("2026-10-19T09:00:00Z").toISOString(),
      createdAt: new Date("2026-10-19T09:00:00Z").toISOString(),
    };
  },
);

const closureId = "10000000-0000-4000-8000-000000000020";

const closure = {
  id: closureId,
  inventoryShiftId: shiftId,
  branchId,
  closedBy: actorId,
  closedAt: new Date("2026-10-19T20:00:00Z").toISOString(),
  notes: "Cierre de prueba",
  createdAt: new Date("2026-10-19T20:00:00Z").toISOString(),
};

const closureItems = [
  {
    id: "10000000-0000-4000-8000-000000000030",
    inventoryClosureId: closureId,
    supplyId,
    openingQuantity: 12,
    closingQuantity: 5,
    createdAt: new Date("2026-10-19T20:00:00Z").toISOString(),
  },
];

const listInventoryClosuresUseCase = mock(async (_filters: unknown, _db: Executor) => [
  closure,
]);

const getInventoryClosureUseCase = mock(async (id: string, _db: Executor) => {
  if (id !== closureId) {
    throw new AppError(404, "INVENTORY_CLOSURE_NOT_FOUND", "Inventory closure not found");
  }
  return { closure, items: closureItems };
});

const closeShiftUseCase = mock(
  async (actor: string, id: string, _input: unknown, _db: Executor) => {
    receivedActor = actor;
    receivedShiftId = id;
    return {
      closure: {
        id: closureId,
        inventoryShiftId: id,
        branchId,
        closedBy: actor,
        closedAt: new Date("2026-10-19T20:00:00Z").toISOString(),
        notes: null,
        createdAt: new Date("2026-10-19T20:00:00Z").toISOString(),
      },
      replenishmentRequest: {
        id: "10000000-0000-4000-8000-000000000040",
        requestNumber: "RR-10000000-0001",
        status: "draft" as const,
        branchId,
        inventoryClosureId: closureId,
        requestedBy: actor,
        notes: null,
        items: [{ supplyId, suggestedQuantity: 5, requestedQuantity: 5 }],
      },
    };
  },
);

const getClosureReportUseCase = mock(async (id: string, _db: Executor) => {
  if (id !== closureId) {
    throw new AppError(404, "INVENTORY_CLOSURE_NOT_FOUND", "Inventory closure not found");
  }
  return {
    closure: {
      id: closureId,
      inventoryShiftId: id,
      branchId,
      closedBy: actorId,
      closedAt: new Date("2026-10-19T20:00:00Z").toISOString(),
      notes: null,
      createdAt: new Date("2026-10-19T20:00:00Z").toISOString(),
    },
    shift: {
      id,
      branchId,
      businessDate: "2026-10-19",
      shiftName: "morning" as const,
      status: "closed" as const,
      openedBy: actorId,
      closedBy: actorId,
      openedAt: new Date("2026-10-19T08:00:00Z").toISOString(),
      closedAt: new Date("2026-10-19T20:00:00Z").toISOString(),
      notes: null,
      createdAt: new Date("2026-10-19T08:00:00Z").toISOString(),
    },
    items: [
      {
        closureItem: {
          id: "10000000-0000-4000-8000-000000000030",
          inventoryClosureId: closureId,
          supplyId,
          openingQuantity: 12,
          closingQuantity: 5,
          createdAt: new Date("2026-10-19T20:00:00Z").toISOString(),
        },
        supply: { id: supplyId, sku: "SKU-1", name: "Azúcar" },
        targetQuantity: 10,
        receivedQuantityInShift: 0,
        requestedQuantity: 5,
      },
    ],
    replenishmentRequest: {
      id: "10000000-0000-4000-8000-000000000040",
      requestNumber: "RR-10000000-0001",
      status: "draft" as const,
      items: [{ supplyId, requestedQuantity: 5 }],
    },
  };
});

mock.module("./use-cases/create-shift.usecase.js", () => ({ createShiftUseCase }));
mock.module("./use-cases/list-shifts.usecase.js", () => ({
  listShiftsUseCase,
  getShiftUseCase,
}));
mock.module("./use-cases/record-receipt.usecase.js", () => ({ recordReceiptUseCase }));
mock.module("./use-cases/list-closures.usecase.js", () => ({
  listInventoryClosuresUseCase,
  getInventoryClosureUseCase,
}));
mock.module("./use-cases/close-shift.usecase.js", () => ({ closeShiftUseCase }));
mock.module("./use-cases/get-closure-report.usecase.js", () => ({ getClosureReportUseCase }));

const { inventoryRouter } = await import("./inventory.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.use("*", async (ctx, next) => {
    ctx.set("db", {} as Executor);
    ctx.set("userId", actorId);
    await next();
  });
  app.use("*", devActorMiddleware);
  app.onError(errorHandler);
  app.route("/", inventoryRouter);
  configureOpenApi(app);

  return app;
}

beforeEach(() => {
  receivedActor = undefined;
  receivedShiftId = undefined;
  receivedReceipt = undefined;
  createShiftUseCase.mockClear();
  listShiftsUseCase.mockClear();
  getShiftUseCase.mockClear();
  recordReceiptUseCase.mockClear();
  listInventoryClosuresUseCase.mockClear();
  getInventoryClosureUseCase.mockClear();
  closeShiftUseCase.mockClear();
  getClosureReportUseCase.mockClear();
});

describe("inventory shifts", () => {
  test("opens a new shift", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        businessDate: "2026-10-19",
        shiftName: "morning",
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.branchId).toBe(branchId);
    expect(body.data.businessDate).toBe("2026-10-19");
    expect(body.data.shiftName).toBe("morning");
    expect(receivedActor).toBe(actorId);
    expect(createShiftUseCase).toHaveBeenCalledTimes(1);
  });

  test("returns 409 when an open shift already exists", async () => {
    createShiftUseCase.mockImplementationOnce(async () => {
      throw new AppError(
        409,
        "SHIFT_ALREADY_OPEN",
        "An open shift already exists for this branch, date and shift",
      );
    });

    const app = createTestApp();
    const response = await app.request("/inventory-shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        businessDate: "2026-10-19",
        shiftName: "morning",
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "SHIFT_ALREADY_OPEN",
        message: "An open shift already exists for this branch, date and shift",
      },
    });
  });

  test("rejects an invalid request body", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, businessDate: "not-a-date", shiftName: "morning" }),
    });

    expect(response.status).toBe(400);
    expect(createShiftUseCase).not.toHaveBeenCalled();
  });

  test("lists inventory shifts", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-shifts?branchId=" + branchId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [openedShift] });
  });

  test("gets an inventory shift by id", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-shifts/${shiftId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: openedShift });
  });

  test("returns 404 when shift does not exist", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-shifts/00000000-0000-4000-8000-000000000099");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "INVENTORY_SHIFT_NOT_FOUND", message: "Inventory shift not found" },
    });
  });

  test("rejects an invalid shift id", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-shifts/not-a-uuid");

    expect(response.status).toBe(400);
    expect(getShiftUseCase).not.toHaveBeenCalled();
  });
});

describe("inventory receipts", () => {
  test("records a receipt on an open shift", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-shifts/${shiftId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplyId,
        receivedQuantity: 10,
        incidentType: "none",
      }),
    });

    expect(response.status).toBe(201);
    expect(receivedActor).toBe(actorId);
    expect(receivedShiftId).toBe(shiftId);
    expect(receivedReceipt).toEqual({
      supplyId,
      receivedQuantity: 10,
      incidentType: "none",
    });
  });

  test("returns 409 when the shift is closed", async () => {
    recordReceiptUseCase.mockImplementationOnce(async () => {
      throw new AppError(409, "SHIFT_CLOSED", "Cannot record a receipt for a closed shift");
    });

    const app = createTestApp();
    const response = await app.request(`/inventory-shifts/${shiftId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplyId, receivedQuantity: 10 }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "SHIFT_CLOSED", message: "Cannot record a receipt for a closed shift" },
    });
  });

  test("returns 404 when the shift does not exist", async () => {
    recordReceiptUseCase.mockImplementationOnce(async () => {
      throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
    });

    const app = createTestApp();
    const response = await app.request(
      "/inventory-shifts/00000000-0000-4000-8000-000000000099/receipts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyId, receivedQuantity: 10 }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("records multiple receipts for the same supply in the same shift", async () => {
    const app = createTestApp();

    const first = await app.request(`/inventory-shifts/${shiftId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplyId, receivedQuantity: 5 }),
    });
    expect(first.status).toBe(201);

    recordReceiptUseCase.mockResolvedValueOnce({
      id: "10000000-0000-4000-8000-000000000011",
      inventoryShiftId: shiftId,
      supplyId,
      purchaseId: null,
      expectedQuantity: null,
      receivedQuantity: 5,
      incidentType: "none",
      notes: null,
      receivedBy: actorId,
      receivedAt: new Date("2026-10-19T10:00:00Z").toISOString(),
      createdAt: new Date("2026-10-19T10:00:00Z").toISOString(),
    });

    const second = await app.request(`/inventory-shifts/${shiftId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplyId, receivedQuantity: 3 }),
    });
    expect(second.status).toBe(201);

    expect(recordReceiptUseCase).toHaveBeenCalledTimes(2);
  });
});

describe("inventory closures", () => {
  test("lists closures filtered by branch", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-closures?branchId=${branchId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [closure] });
    expect(listInventoryClosuresUseCase).toHaveBeenCalledTimes(1);
  });

  test("rejects an invalid branchId query", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-closures?branchId=not-a-uuid");

    expect(response.status).toBe(400);
    expect(listInventoryClosuresUseCase).not.toHaveBeenCalled();
  });

  test("gets a closure by id with items", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-closures/${closureId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...closure, items: closureItems },
    });
  });

  test("returns 404 when the closure does not exist", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/inventory-closures/00000000-0000-4000-8000-000000000099",
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "INVENTORY_CLOSURE_NOT_FOUND", message: "Inventory closure not found" },
    });
  });

  test("rejects an invalid closure id", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-closures/not-a-uuid");

    expect(response.status).toBe(400);
    expect(getInventoryClosureUseCase).not.toHaveBeenCalled();
  });
});

describe("close inventory shift", () => {
  test("closes a shift and generates a replenishment request", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-shifts/${shiftId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closingItems: [{ supplyId, closingQuantity: 3 }],
        notes: "Cierre OK",
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.closure.id).toBe(closureId);
    expect(body.data.replenishmentRequest.requestNumber).toBe("RR-10000000-0001");
    expect(receivedActor).toBe(actorId);
    expect(receivedShiftId).toBe(shiftId);
    expect(closeShiftUseCase).toHaveBeenCalledTimes(1);
  });

  test("returns 404 when the shift does not exist", async () => {
    closeShiftUseCase.mockImplementationOnce(async () => {
      throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
    });

    const app = createTestApp();
    const response = await app.request(
      "/inventory-shifts/00000000-0000-4000-8000-000000000099/close",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingItems: [{ supplyId, closingQuantity: 1 }] }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("returns 409 when the shift is already closed", async () => {
    closeShiftUseCase.mockImplementationOnce(async () => {
      throw new AppError(409, "SHIFT_CLOSED", "The shift is already closed");
    });

    const app = createTestApp();
    const response = await app.request(`/inventory-shifts/${shiftId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingItems: [{ supplyId, closingQuantity: 1 }] }),
    });

    expect(response.status).toBe(409);
  });

  test("rejects an empty closingItems list", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-shifts/${shiftId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingItems: [] }),
    });

    expect(response.status).toBe(400);
    expect(closeShiftUseCase).not.toHaveBeenCalled();
  });

  test("rejects an invalid shift id", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-shifts/not-a-uuid/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingItems: [{ supplyId, closingQuantity: 1 }] }),
    });

    expect(response.status).toBe(400);
    expect(closeShiftUseCase).not.toHaveBeenCalled();
  });
});

describe("inventory closure report", () => {
  test("returns the closure report", async () => {
    const app = createTestApp();
    const response = await app.request(`/inventory-closures/${closureId}/report`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.closure.id).toBe(closureId);
    expect(body.data.items[0].supply.sku).toBe("SKU-1");
    expect(body.data.items[0].requestedQuantity).toBe(5);
    expect(body.data.replenishmentRequest.requestNumber).toBe("RR-10000000-0001");
  });

  test("returns 404 when the closure does not exist", async () => {
    getClosureReportUseCase.mockImplementationOnce(async () => {
      throw new AppError(404, "INVENTORY_CLOSURE_NOT_FOUND", "Inventory closure not found");
    });

    const app = createTestApp();
    const response = await app.request(
      "/inventory-closures/00000000-0000-4000-8000-000000000099/report",
    );

    expect(response.status).toBe(404);
  });

  test("rejects an invalid closure id", async () => {
    const app = createTestApp();
    const response = await app.request("/inventory-closures/not-a-uuid/report");

    expect(response.status).toBe(400);
    expect(getClosureReportUseCase).not.toHaveBeenCalled();
  });
});
