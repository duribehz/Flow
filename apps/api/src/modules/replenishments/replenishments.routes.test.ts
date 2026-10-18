import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/http/openapi.js";
import { createReplenishmentsRoutes } from "./replenishments.routes.js";
import { replenishmentDetail, submittedReplenishment } from "./replenishment.usecase.test.js";

function createTestApp(detailExists = true) {
  const app = new OpenAPIHono();
  const useCase = {
    async getSubmittedReplenishments() {
      return [submittedReplenishment];
    },
    async getReplenishmentById() {
      if (!detailExists) {
        throw new AppError(404, "REPLENISHMENT_NOT_FOUND", "Replenishment request not found");
      }

      return replenishmentDetail;
    },
  };

  app.onError(errorHandler);
  app.route("/replenishments", createReplenishmentsRoutes(useCase));
  configureOpenApi(app);

  return app;
}

describe("replenishment routes", () => {
  test("lists submitted replenishments", async () => {
    const response = await createTestApp().request("/replenishments");

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
    const response = await createTestApp().request(`/replenishments/${replenishmentDetail.id}`);

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
    const response = await createTestApp().request("/replenishments/not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request parameters" },
    });
  });

  test("returns 404 when the replenishment does not exist", async () => {
    const response = await createTestApp(false).request(
      "/replenishments/10000000-0000-4000-8000-000000000099",
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
    const response = await createTestApp().request("/openapi.json");
    const document = (await response.json()) as { paths: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(document.paths).toHaveProperty("/replenishments");
    expect(document.paths).toHaveProperty("/replenishments/{replenishmentId}");
  });
});
