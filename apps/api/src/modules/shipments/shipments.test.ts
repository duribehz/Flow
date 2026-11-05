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
  status: "dispatched",
  preparedBy: { id: actorId, userName: "warehouse" },
  dispatchedBy: { id: actorId, userName: "warehouse" },
  preparedAt: now,
  dispatchedAt: now,
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
      shippedQuantity: 300,
      createdAt: now,
    },
  ],
};

const listShipmentsUseCase = mock(async (_status: string | undefined, _db: Executor) => [shipment]);
const getShipmentUseCase = mock(async (_id: string, _db: Executor) => shipment);

mock.module("./use-cases/list-shipments.usecase.js", () => ({ listShipmentsUseCase }));
mock.module("./use-cases/get-shipment.usecase.js", () => ({ getShipmentUseCase }));

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
  listShipmentsUseCase.mockClear();
  getShipmentUseCase.mockClear();
});

describe("shipment routes", () => {
  test("lists and gets dispatched shipments", async () => {
    const app = createTestApp();
    const list = await app.request("/v1/shipments?status=dispatched");
    const get = await app.request(`/v1/shipments/${shipmentId}`);

    expect(list.status).toBe(200);
    expect(get.status).toBe(200);
    expect((await get.json()).data.status).toBe("dispatched");
  });

  test("rejects removed preparation filters and publishes read-only OpenAPI routes", async () => {
    const app = createTestApp();
    const invalid = await app.request("/v1/shipments?status=preparing");
    const document = (await (await app.request("/v1/openapi.json")).json()) as {
      paths: Record<string, unknown>;
    };
    expect(invalid.status).toBe(400);
    expect(document.paths).toHaveProperty("/v1/shipments");
    expect(document.paths).toHaveProperty("/v1/shipments/{shipmentId}");
    expect(document.paths).not.toHaveProperty("/v1/shipments/{shipmentId}/dispatch");
  });
});
