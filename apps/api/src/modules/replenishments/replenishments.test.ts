import { describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import type { ReplenishmentDetail, SubmittedReplenishment } from "./replenishments.repo.js";

const submittedReplenishment: SubmittedReplenishment = {
  id: "10000000-0000-4000-8000-000000000001",
  requestNumber: "REQ-001",
  branch: {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Centro",
  },
  status: "submitted",
  requestedBy: {
    id: "30000000-0000-4000-8000-000000000001",
    userName: "requester",
  },
  submittedAt: new Date("2026-10-13T12:00:00.000Z"),
  createdAt: new Date("2026-10-13T11:00:00.000Z"),
};

const replenishmentDetail: ReplenishmentDetail = {
  ...submittedReplenishment,
  inventoryCountId: "40000000-0000-4000-8000-000000000001",
  reviewedBy: null,
  reviewedAt: null,
  notes: null,
  updatedAt: new Date("2026-10-13T12:00:00.000Z"),
  items: [],
};

const draftReplenishment = {
  id: replenishmentDetail.id,
  requestNumber: replenishmentDetail.requestNumber,
  inventoryCountId: replenishmentDetail.inventoryCountId,
  status: "draft" as const,
  branch: replenishmentDetail.branch,
  requestedBy: replenishmentDetail.requestedBy,
  createdAt: replenishmentDetail.createdAt,
  updatedAt: replenishmentDetail.updatedAt,
};

const getSubmittedReplenishmentsUseCase = mock(async (_db: Executor) => [submittedReplenishment]);
const getDraftReplenishmentsUseCase = mock(async (_db: Executor) => [draftReplenishment]);
const getReplenishmentUseCase = mock(
  async (_replenishmentId: string, _db: Executor) => replenishmentDetail,
);
const updateReplenishmentNotesUseCase = mock(
  async (_id: string, _notes: string | null, _db: Executor) => replenishmentDetail,
);
const addReplenishmentItemUseCase = mock(
  async (_id: string, _body: unknown, _db: Executor) => replenishmentDetail,
);
const updateReplenishmentItemUseCase = mock(
  async (_id: string, _itemId: string, _body: unknown, _db: Executor) => replenishmentDetail,
);
const deleteReplenishmentItemUseCase = mock(
  async (_id: string, _itemId: string, _db: Executor) => replenishmentDetail,
);
const submitReplenishmentUseCase = mock(async (_id: string, _db: Executor) => replenishmentDetail);

mock.module("./use-cases/get-submitted-replenishments.usecase.js", () => ({
  getSubmittedReplenishmentsUseCase,
}));
mock.module("./use-cases/get-draft-replenishments.usecase.js", () => ({
  getDraftReplenishmentsUseCase,
}));
mock.module("./use-cases/update-replenishment-notes.usecase.js", () => ({
  updateReplenishmentNotesUseCase,
}));
mock.module("./use-cases/add-replenishment-item.usecase.js", () => ({
  addReplenishmentItemUseCase,
}));
mock.module("./use-cases/update-replenishment-item.usecase.js", () => ({
  updateReplenishmentItemUseCase,
}));
mock.module("./use-cases/delete-replenishment-item.usecase.js", () => ({
  deleteReplenishmentItemUseCase,
}));
mock.module("./use-cases/submit-replenishment.usecase.js", () => ({
  submitReplenishmentUseCase,
}));
mock.module("./use-cases/get-replenishment.usecase.js", () => ({
  getReplenishmentUseCase,
}));

const { replenishmentsRouter } = await import("./replenishments.router.js");

function createTestApp(detailExists = true) {
  const app = new OpenAPIHono<State>();

  getReplenishmentUseCase.mockImplementation(async () => {
    if (!detailExists) {
      throw new AppError(404, "REPLENISHMENT_NOT_FOUND", "Replenishment request not found");
    }

    return replenishmentDetail;
  });

  app.use("*", async (context, next) => {
    context.set("db", {} as Executor);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/replenishments", replenishmentsRouter);
  configureOpenApi(app);

  return app;
}

describe("replenishment routes", () => {
  test("lists submitted replenishments", async () => {
    const response = await createTestApp().request("/v1/replenishments");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        {
          ...submittedReplenishment,
          submittedAt: "2026-10-13T12:00:00.000Z",
          createdAt: "2026-10-13T11:00:00.000Z",
        },
      ],
    });
  });

  test("lists draft requests so they can be edited", async () => {
    const response = await createTestApp().request("/v1/replenishments/drafts");

    expect(response.status).toBe(200);
    expect((await response.json()).data[0]).toMatchObject({
      id: draftReplenishment.id,
      status: "draft",
      createdAt: draftReplenishment.createdAt.toISOString(),
    });
  });

  test("gets a replenishment detail", async () => {
    const response = await createTestApp().request(`/v1/replenishments/${replenishmentDetail.id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        ...replenishmentDetail,
        submittedAt: "2026-10-13T12:00:00.000Z",
        reviewedAt: null,
        createdAt: "2026-10-13T11:00:00.000Z",
        updatedAt: "2026-10-13T12:00:00.000Z",
      },
    });
  });

  test("rejects an invalid replenishment ID", async () => {
    const response = await createTestApp().request("/v1/replenishments/not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request parameters" },
    });
  });

  test("returns 404 when the replenishment does not exist", async () => {
    const response = await createTestApp(false).request(
      "/v1/replenishments/10000000-0000-4000-8000-000000000099",
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "REPLENISHMENT_NOT_FOUND",
        message: "Replenishment request not found",
      },
    });
  });

  test("supports draft note and line mutations and submits the request", async () => {
    const app = createTestApp();
    const requestId = replenishmentDetail.id;
    const itemId = "50000000-0000-4000-8000-000000000001";
    const patchNotes = await app.request(`/v1/replenishments/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Urgente" }),
    });
    const addItem = await app.request(`/v1/replenishments/${requestId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplyId: "50000000-0000-4000-8000-000000000002",
        usagePurposeId: "50000000-0000-4000-8000-000000000003",
        requestedQuantity: 50,
      }),
    });
    const patchItem = await app.request(`/v1/replenishments/${requestId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedQuantity: 75 }),
    });
    const deleteItem = await app.request(`/v1/replenishments/${requestId}/items/${itemId}`, {
      method: "DELETE",
    });
    const submit = await app.request(`/v1/replenishments/${requestId}/submit`, {
      method: "POST",
    });

    expect([
      patchNotes.status,
      addItem.status,
      patchItem.status,
      deleteItem.status,
      submit.status,
    ]).toEqual([200, 200, 200, 200, 200]);
    expect(updateReplenishmentNotesUseCase).toHaveBeenCalledWith(
      requestId,
      "Urgente",
      expect.anything(),
    );
    expect(addReplenishmentItemUseCase).toHaveBeenCalledTimes(1);
    expect(updateReplenishmentItemUseCase).toHaveBeenCalledTimes(1);
    expect(deleteReplenishmentItemUseCase).toHaveBeenCalledTimes(1);
    expect(submitReplenishmentUseCase).toHaveBeenCalledWith(requestId, expect.anything());
  });

  test("allows zero in draft lines and rejects invalid quantities and empty patches", async () => {
    addReplenishmentItemUseCase.mockClear();
    updateReplenishmentItemUseCase.mockClear();
    const app = createTestApp();
    const requestId = replenishmentDetail.id;
    const zeroDraftLine = await app.request(`/v1/replenishments/${requestId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplyId: "50000000-0000-4000-8000-000000000002",
        usagePurposeId: "50000000-0000-4000-8000-000000000003",
        requestedQuantity: 0,
      }),
    });
    const invalidAdd = await app.request(`/v1/replenishments/${requestId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplyId: "50000000-0000-4000-8000-000000000002",
        usagePurposeId: "50000000-0000-4000-8000-000000000003",
        requestedQuantity: -1,
      }),
    });
    const emptyItemPatch = await app.request(
      `/v1/replenishments/${requestId}/items/50000000-0000-4000-8000-000000000001`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" },
    );

    expect(zeroDraftLine.status).toBe(200);
    expect(invalidAdd.status).toBe(400);
    expect(emptyItemPatch.status).toBe(400);
    expect(addReplenishmentItemUseCase).toHaveBeenCalledTimes(1);
    expect(updateReplenishmentItemUseCase).not.toHaveBeenCalled();
  });

  test("reports the positive-quantity requirement when submitting draft lines", async () => {
    submitReplenishmentUseCase.mockImplementationOnce(async () => {
      throw new AppError(
        400,
        "REPLENISHMENT_ITEMS_REQUIRE_POSITIVE_QUANTITY",
        "A replenishment request requires items with positive requested quantities",
      );
    });
    const response = await createTestApp().request(
      `/v1/replenishments/${replenishmentDetail.id}/submit`,
      { method: "POST" },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe(
      "REPLENISHMENT_ITEMS_REQUIRE_POSITIVE_QUANTITY",
    );
  });

  test("publishes the replenishment OpenAPI contract", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as { paths: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(document.paths).toHaveProperty("/v1/replenishments");
    expect(document.paths).toHaveProperty("/v1/replenishments/drafts");
    expect(document.paths).toHaveProperty("/v1/replenishments/{replenishmentId}");
    expect(document.paths).toHaveProperty("/v1/replenishments/{replenishmentId}/items");
    expect(document.paths).toHaveProperty("/v1/replenishments/{replenishmentId}/items/{itemId}");
    expect(document.paths).toHaveProperty("/v1/replenishments/{replenishmentId}/submit");
  });
});
