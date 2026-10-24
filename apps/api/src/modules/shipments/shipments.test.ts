import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { ShipmentDetail } from "./shipments.repo.js";

const actorId = "00000000-0000-4000-8000-000000000001";
const shipmentId = "10000000-0000-4000-8000-000000000001";
const requestId = "10000000-0000-4000-8000-000000000002";
const now = new Date("2026-10-24T12:00:00.000Z");
const shipment: ShipmentDetail = {
  id: shipmentId,
  shipmentNumber: "SHP-001",
  branch: { id: "10000000-0000-4000-8000-000000000003", name: "Centro" },
  replenishmentRequestId: requestId,
  status: "preparing",
  preparedBy: { id: actorId, userName: "warehouse" },
  dispatchedBy: null,
  preparedAt: now,
  dispatchedAt: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: "10000000-0000-4000-8000-000000000004",
      replenishmentRequestItemId: "10000000-0000-4000-8000-000000000005",
      supply: { id: "10000000-0000-4000-8000-000000000006", sku: "TOM-1", name: "Jitomate" },
      usagePurposeId: "10000000-0000-4000-8000-000000000007",
      usagePurposeName: "Cocina general",
      plannedQuantity: 300,
      shippedQuantity: 0,
      createdAt: now,
    },
  ],
};

const createShipmentUseCase = mock(
  async (_requestId: string, _actorId: string, _db: Executor) => shipment,
);
const listShipmentsUseCase = mock(async (_status: string | undefined, _db: Executor) => [shipment]);
const getShipmentUseCase = mock(async (_id: string, _db: Executor) => shipment);
const dispatchShipmentUseCase = mock(async (_id: string, _actorId: string, _db: Executor) => ({
  ...shipment,
  status: "dispatched" as const,
  dispatchedBy: { id: actorId, userName: "warehouse" },
  dispatchedAt: now,
}));

mock.module("./use-cases/create-shipment.usecase.js", () => ({ createShipmentUseCase }));
mock.module("./use-cases/list-shipments.usecase.js", () => ({ listShipmentsUseCase }));
mock.module("./use-cases/get-shipment.usecase.js", () => ({ getShipmentUseCase }));
mock.module("./use-cases/dispatch-shipment.usecase.js", () => ({ dispatchShipmentUseCase }));

const { shipmentsRouter } = await import("./shipments.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", {} as Executor);
    context.set("userId", actorId);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/shipments", shipmentsRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  createShipmentUseCase.mockClear();
  listShipmentsUseCase.mockClear();
  getShipmentUseCase.mockClear();
  dispatchShipmentUseCase.mockClear();
});

describe("shipment routes", () => {
  test("creates one shipment with order-line and purpose references", async () => {
    const response = await createTestApp().request("/v1/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replenishmentRequestId: requestId }),
    });

    expect(response.status).toBe(201);
    expect((await response.json()).data.items[0]).toMatchObject({
      replenishmentRequestItemId: shipment.items[0].replenishmentRequestItemId,
      usagePurposeId: shipment.items[0].usagePurposeId,
    });
    expect(createShipmentUseCase).toHaveBeenCalledWith(requestId, actorId, expect.anything());
  });

  test("lists, gets and dispatches shipments", async () => {
    const app = createTestApp();
    const list = await app.request("/v1/shipments?status=preparing");
    const get = await app.request(`/v1/shipments/${shipmentId}`);
    const dispatch = await app.request(`/v1/shipments/${shipmentId}/dispatch`, { method: "POST" });

    expect(list.status).toBe(200);
    expect(get.status).toBe(200);
    expect(dispatch.status).toBe(200);
    expect((await dispatch.json()).data.status).toBe("dispatched");
    expect(dispatchShipmentUseCase).toHaveBeenCalledWith(shipmentId, actorId, expect.anything());
  });

  test("rejects invalid create data and publishes OpenAPI routes", async () => {
    const app = createTestApp();
    const invalid = await app.request("/v1/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replenishmentRequestId: "bad" }),
    });
    const document = (await (await app.request("/v1/openapi.json")).json()) as {
      paths: Record<string, unknown>;
    };
    expect(invalid.status).toBe(400);
    expect(document.paths).toHaveProperty("/v1/shipments");
    expect(document.paths).toHaveProperty("/v1/shipments/{shipmentId}/dispatch");
  });
});
