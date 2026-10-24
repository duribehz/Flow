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

const getSubmittedReplenishmentsUseCase = mock(async (_db: Executor) => [submittedReplenishment]);
const getReplenishmentUseCase = mock(
  async (_replenishmentId: string, _db: Executor) => replenishmentDetail,
);

mock.module("./use-cases/get-submitted-replenishments.usecase.js", () => ({
  getSubmittedReplenishmentsUseCase,
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

  test("publishes the replenishment OpenAPI contract", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as { paths: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(document.paths).toHaveProperty("/v1/replenishments");
    expect(document.paths).toHaveProperty("/v1/replenishments/{replenishmentId}");
  });
});
