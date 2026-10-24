import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";

const actorId = "00000000-0000-4000-8000-000000000001";
const branchId = "10000000-0000-4000-8000-000000000001";
const dayId = "10000000-0000-4000-8000-000000000002";
const countId = "10000000-0000-4000-8000-000000000003";
const supplyId = "10000000-0000-4000-8000-000000000004";
const secondSupplyId = "10000000-0000-4000-8000-000000000005";
const now = new Date("2026-10-24T12:00:00.000Z");

const day = {
  id: dayId,
  branchId,
  businessDate: "2026-10-24",
  status: "open" as const,
  openedBy: actorId,
  closedBy: null,
  openedAt: now,
  closedAt: null,
  notes: null,
  createdAt: now,
};

const item = {
  id: "10000000-0000-4000-8000-000000000006",
  inventoryCountId: countId,
  supplyId,
  counted: false,
  openingQuantity: 250,
  receivedQuantity: 100,
  closingQuantity: null,
  lastCountedAt: null,
  createdAt: now,
};

const count = {
  id: countId,
  inventoryDayId: dayId,
  branchId,
  status: "draft" as const,
  notes: null,
  createdBy: actorId,
  submittedBy: null,
  reviewedBy: null,
  submittedAt: null,
  reviewedAt: null,
  createdAt: now,
};

let createItems = [item];
let updateInput: unknown;

const createInventoryCountUseCase = mock(async () => ({ ...count, items: createItems }));
const listInventoryDaysUseCase = mock(async () => [day]);
const getInventoryDayUseCase = mock(async () => day);
const listInventoryCountsUseCase = mock(async () => [count]);
const getInventoryCountUseCase = mock(async () => ({ ...count, items: [item] }));
const updateInventoryCountUseCase = mock(async (_id: string, input: unknown) => {
  updateInput = input;
  return {
    ...count,
    items: [
      { ...item, counted: false, closingQuantity: null },
      {
        ...item,
        id: "10000000-0000-4000-8000-000000000007",
        supplyId: secondSupplyId,
        counted: true,
        closingQuantity: 0,
      },
    ],
  };
});
const submitInventoryCountUseCase = mock(async () => ({
  ...count,
  status: "submitted" as const,
  submittedBy: actorId,
  submittedAt: now,
  items: [{ ...item, receivedQuantity: 175 }],
}));
const reviewInventoryCountUseCase = mock(async () => ({
  ...count,
  status: "reviewed" as const,
  submittedBy: actorId,
  reviewedBy: actorId,
  submittedAt: now,
  reviewedAt: now,
  items: [item],
}));

mock.module("./use-cases/create-inventory-count.usecase.js", () => ({
  createInventoryCountUseCase,
}));
mock.module("./use-cases/list-inventory-days.usecase.js", () => ({ listInventoryDaysUseCase }));
mock.module("./use-cases/get-inventory-day.usecase.js", () => ({ getInventoryDayUseCase }));
mock.module("./use-cases/list-inventory-counts.usecase.js", () => ({
  listInventoryCountsUseCase,
}));
mock.module("./use-cases/get-inventory-count.usecase.js", () => ({ getInventoryCountUseCase }));
mock.module("./use-cases/update-inventory-count.usecase.js", () => ({
  updateInventoryCountUseCase,
}));
mock.module("./use-cases/submit-inventory-count.usecase.js", () => ({
  submitInventoryCountUseCase,
}));
mock.module("./use-cases/review-inventory-count.usecase.js", () => ({
  reviewInventoryCountUseCase,
}));

const { inventoryRouter } = await import("./inventory.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (ctx, next) => {
    ctx.set("db", {} as Executor);
    ctx.set("userId", actorId);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1", inventoryRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  createItems = [item];
  updateInput = undefined;
  createInventoryCountUseCase.mockClear();
  listInventoryDaysUseCase.mockClear();
  getInventoryDayUseCase.mockClear();
  listInventoryCountsUseCase.mockClear();
  getInventoryCountUseCase.mockClear();
  updateInventoryCountUseCase.mockClear();
  submitInventoryCountUseCase.mockClear();
  reviewInventoryCountUseCase.mockClear();
});

describe("inventory routes", () => {
  test("lists and gets inventory days", async () => {
    const app = createTestApp();
    const listResponse = await app.request(`/v1/inventory-days?branchId=${branchId}&status=open`);
    const getResponse = await app.request(`/v1/inventory-days/${dayId}`);

    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).data[0].openedAt).toBe(now.toISOString());
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).data.id).toBe(dayId);
  });

  test("creates a draft with an empty snapshot", async () => {
    createItems = [];
    const response = await createTestApp().request("/v1/inventory-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, businessDate: "2026-10-24" }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { status: "draft", items: [] } });
    expect(createInventoryCountUseCase).toHaveBeenCalledTimes(1);
  });

  test("lists and gets inventory counts", async () => {
    const app = createTestApp();
    const listResponse = await app.request(
      `/v1/inventory-counts?status=draft&branchId=${branchId}`,
    );
    const getResponse = await app.request(`/v1/inventory-counts/${countId}`);

    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).data[0].status).toBe("draft");
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).data.items[0].closingQuantity).toBeNull();
  });

  test("preserves null as uncounted and zero as counted on patch", async () => {
    const response = await createTestApp().request(`/v1/inventory-counts/${countId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { supplyId, closingQuantity: null },
          { supplyId: secondSupplyId, closingQuantity: 0 },
        ],
      }),
    });

    expect(response.status).toBe(200);
    expect(updateInput).toEqual({
      items: [
        { supplyId, closingQuantity: null },
        { supplyId: secondSupplyId, closingQuantity: 0 },
      ],
    });
    expect((await response.json()).data.items).toMatchObject([
      { counted: false, closingQuantity: null },
      { counted: true, closingQuantity: 0 },
    ]);
  });

  test("submits and reviews through independent routes", async () => {
    const app = createTestApp();
    const submitResponse = await app.request(`/v1/inventory-counts/${countId}/submit`, {
      method: "POST",
    });
    const reviewResponse = await app.request(`/v1/inventory-counts/${countId}/review`, {
      method: "POST",
    });

    expect(submitResponse.status).toBe(200);
    expect((await submitResponse.json()).data).toMatchObject({
      status: "submitted",
      items: [{ receivedQuantity: 175 }],
    });
    expect(reviewResponse.status).toBe(200);
    expect((await reviewResponse.json()).data.status).toBe("reviewed");
  });

  test("returns domain conflicts through the global error handler", async () => {
    submitInventoryCountUseCase.mockImplementationOnce(async () => {
      throw new AppError(409, "INVENTORY_COUNT_NOT_DRAFT", "Inventory count is not a draft");
    });
    const response = await createTestApp().request(`/v1/inventory-counts/${countId}/submit`, {
      method: "POST",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "INVENTORY_COUNT_NOT_DRAFT", message: "Inventory count is not a draft" },
    });
  });

  test("rejects invalid IDs, quantities, duplicate supplies and empty patches", async () => {
    const app = createTestApp();
    const invalidId = await app.request("/v1/inventory-counts/not-a-uuid");
    const negative = await app.request(`/v1/inventory-counts/${countId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ supplyId, closingQuantity: -1 }] }),
    });
    const duplicate = await app.request(`/v1/inventory-counts/${countId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { supplyId, closingQuantity: null },
          { supplyId, closingQuantity: 0 },
        ],
      }),
    });
    const empty = await app.request(`/v1/inventory-counts/${countId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    expect([invalidId.status, negative.status, duplicate.status, empty.status]).toEqual([
      400, 400, 400, 400,
    ]);
    expect(updateInventoryCountUseCase).not.toHaveBeenCalled();
  });

  test("publishes only the new inventory paths in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, Record<string, { operationId?: string }>>;
    };

    expect(document.paths["/v1/inventory-days"]?.get.operationId).toBe("getInventoryDays");
    expect(document.paths["/v1/inventory-days/{dayId}"]?.get.operationId).toBe(
      "getInventoryDaysDayId",
    );
    expect(document.paths["/v1/inventory-counts"]?.post.operationId).toBe("postInventoryCounts");
    expect(document.paths["/v1/inventory-counts/{countId}"]?.patch.operationId).toBe(
      "patchInventoryCountsCountId",
    );
    expect(document.paths["/v1/inventory-counts/{countId}/submit"]?.post).toBeDefined();
    expect(document.paths["/v1/inventory-counts/{countId}/review"]?.post).toBeDefined();
    expect(document.paths["/v1/inventory-shifts"]).toBeUndefined();
    expect(document.paths["/v1/inventory-closures"]).toBeUndefined();
  });

  test("does not expose legacy routes", async () => {
    const app = createTestApp();
    expect((await app.request("/v1/inventory-shifts")).status).toBe(404);
    expect((await app.request("/v1/inventory-closures")).status).toBe(404);
  });
});
