import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { ReceiptDetail } from "./receipts.repo.js";

const actorId = "00000000-0000-4000-8000-000000000001";
const shipmentId = "10000000-0000-4000-8000-000000000001";
const receiptId = "10000000-0000-4000-8000-000000000002";
const receiptItemId = "10000000-0000-4000-8000-000000000003";
const now = new Date("2026-10-24T12:00:00.000Z");
const receipt: ReceiptDetail = {
  id: receiptId,
  receiptNumber: "REC-001",
  shipmentId,
  inventoryDayId: "10000000-0000-4000-8000-000000000004",
  businessDate: "2026-10-24",
  branch: { id: "10000000-0000-4000-8000-000000000005", name: "Centro" },
  status: "in_progress",
  receivedBy: { id: actorId, userName: "receiver" },
  startedAt: now,
  completedAt: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: receiptItemId,
      shipmentItemId: "10000000-0000-4000-8000-000000000006",
      replenishmentRequestItemId: "10000000-0000-4000-8000-000000000007",
      supply: { id: "10000000-0000-4000-8000-000000000008", sku: "TOM-1", name: "Jitomate" },
      usagePurposeId: "10000000-0000-4000-8000-000000000009",
      usagePurposeName: "Cocina general",
      expectedQuantity: 300,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      condition: null,
      checkedAt: null,
      notes: null,
      createdAt: now,
    },
  ],
};

const createReceiptUseCase = mock(
  async (_shipmentId: string, _actorId: string, _input: unknown, _db: Executor) => receipt,
);
const listReceiptsUseCase = mock(async (_filters: unknown, _db: Executor) => [receipt]);
const getReceiptUseCase = mock(async (_id: string, _db: Executor) => receipt);
const updateReceiptNotesUseCase = mock(
  async (_id: string, _notes: string | null, _db: Executor) => receipt,
);
const updateReceiptItemUseCase = mock(
  async (_id: string, _itemId: string, _input: unknown, _db: Executor) => receipt,
);
const completeReceiptUseCase = mock(async (_id: string, _db: Executor) => ({
  ...receipt,
  status: "completed" as const,
  completedAt: now,
}));

mock.module("./use-cases/create-receipt.usecase.js", () => ({ createReceiptUseCase }));
mock.module("./use-cases/list-receipts.usecase.js", () => ({ listReceiptsUseCase }));
mock.module("./use-cases/get-receipt.usecase.js", () => ({ getReceiptUseCase }));
mock.module("./use-cases/update-receipt-notes.usecase.js", () => ({ updateReceiptNotesUseCase }));
mock.module("./use-cases/update-receipt-item.usecase.js", () => ({ updateReceiptItemUseCase }));
mock.module("./use-cases/complete-receipt.usecase.js", () => ({ completeReceiptUseCase }));

const { receiptsRouter } = await import("./receipts.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", {} as Executor);
    context.set("userId", actorId);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1", receiptsRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  createReceiptUseCase.mockClear();
  listReceiptsUseCase.mockClear();
  getReceiptUseCase.mockClear();
  updateReceiptNotesUseCase.mockClear();
  updateReceiptItemUseCase.mockClear();
  completeReceiptUseCase.mockClear();
});

describe("receipt routes", () => {
  test("starts a receipt against an operational date", async () => {
    const response = await createTestApp().request(`/v1/shipments/${shipmentId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessDate: "2026-10-24" }),
    });

    expect(response.status).toBe(201);
    expect((await response.json()).data.items[0]).toMatchObject({
      replenishmentRequestItemId: receipt.items[0].replenishmentRequestItemId,
      expectedQuantity: 300,
    });
    expect(createReceiptUseCase).toHaveBeenCalledWith(
      shipmentId,
      actorId,
      { businessDate: "2026-10-24" },
      expect.anything(),
    );
  });

  test("lists, gets, edits quantities and completes a receipt", async () => {
    const app = createTestApp();
    const list = await app.request("/v1/receipts?status=in_progress");
    const get = await app.request(`/v1/receipts/${receiptId}`);
    const updateNotes = await app.request(`/v1/receipts/${receiptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Entrega parcial" }),
    });
    const updateItem = await app.request(`/v1/receipts/${receiptId}/items/${receiptItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receivedQuantity: 250,
        acceptedQuantity: 220,
        rejectedQuantity: 30,
        condition: "damaged",
      }),
    });
    const complete = await app.request(`/v1/receipts/${receiptId}/complete`, { method: "POST" });

    expect([
      list.status,
      get.status,
      updateNotes.status,
      updateItem.status,
      complete.status,
    ]).toEqual([200, 200, 200, 200, 200]);
    expect(updateReceiptItemUseCase).toHaveBeenCalledWith(
      receiptId,
      receiptItemId,
      { receivedQuantity: 250, acceptedQuantity: 220, rejectedQuantity: 30, condition: "damaged" },
      expect.anything(),
    );
    expect((await complete.json()).data.status).toBe("completed");
  });

  test("rejects invalid classifications and closed-day conflicts", async () => {
    const app = createTestApp();
    const invalid = await app.request(`/v1/receipts/${receiptId}/items/${receiptItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receivedQuantity: 10,
        acceptedQuantity: 8,
        rejectedQuantity: 3,
        condition: "good",
      }),
    });
    completeReceiptUseCase.mockImplementationOnce(async () => {
      throw new AppError(
        409,
        "INVENTORY_DAY_CLOSED",
        "Receipt cannot complete on a closed inventory day",
      );
    });
    const closedDay = await app.request(`/v1/receipts/${receiptId}/complete`, { method: "POST" });

    expect(invalid.status).toBe(400);
    expect(closedDay.status).toBe(409);
    expect((await closedDay.json()).error.code).toBe("INVENTORY_DAY_CLOSED");
  });

  test("publishes receipt workflow routes in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as { paths: Record<string, unknown> };
    expect(document.paths).toHaveProperty("/v1/shipments/{shipmentId}/receipts");
    expect(document.paths).toHaveProperty("/v1/receipts/{receiptId}/items/{itemId}");
    expect(document.paths).toHaveProperty("/v1/receipts/{receiptId}/complete");
  });
});
