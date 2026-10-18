import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/http/openapi.js";
import { createSuppliesRoutes } from "./supplies.routes.js";
import { createSupplyInput, supply } from "./supplies.usecase.test.js";

function createTestApp() {
  const app = new OpenAPIHono();
  const useCase = {
    async getSupplies() {
      return [supply];
    },
    async createSupply() {
      return supply;
    },
    async replaceSupplySuppliers() {
      return supply;
    },
  };

  app.onError(errorHandler);
  app.route("/supplies", createSuppliesRoutes(useCase));
  configureOpenApi(app);

  return app;
}

const supplyResponse = {
  ...supply,
  createdAt: "2026-10-13T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
};

describe("supply routes", () => {
  test("lists supplies", async () => {
    const response = await createTestApp().request("/supplies");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [supplyResponse] });
  });

  test("creates a supply", async () => {
    const response = await createTestApp().request("/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createSupplyInput),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: supplyResponse });
  });

  test("applies defaults when creating a supply", async () => {
    let receivedInput: unknown;
    const app = new OpenAPIHono();

    app.route(
      "/supplies",
      createSuppliesRoutes({
        async getSupplies() {
          return [];
        },
        async createSupply(input) {
          receivedInput = input;
          return supply;
        },
        async replaceSupplySuppliers() {
          return supply;
        },
      }),
    );

    const response = await app.request("/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: createSupplyInput.sku,
        name: createSupplyInput.name,
        unitId: createSupplyInput.unitId,
        categoryId: createSupplyInput.categoryId,
        supplierIds: createSupplyInput.supplierIds,
      }),
    });

    expect(response.status).toBe(201);
    expect(receivedInput).toMatchObject({ unitCost: 0, active: true });
  });

  test("rejects invalid input", async () => {
    const response = await createTestApp().request("/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...createSupplyInput, unitCost: -1 }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("rejects creating a supply without suppliers", async () => {
    const response = await createTestApp().request("/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...createSupplyInput, supplierIds: [] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("replaces a supply's suppliers", async () => {
    const response = await createTestApp().request(`/supplies/${supply.id}/suppliers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierIds: createSupplyInput.supplierIds }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: supplyResponse });
  });

  test("rejects duplicate suppliers when replacing", async () => {
    const supplierId = createSupplyInput.supplierIds[0]!;
    const response = await createTestApp().request(`/supplies/${supply.id}/suppliers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierIds: [supplierId, supplierId] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("publishes list and create operations in OpenAPI", async () => {
    const response = await createTestApp().request("/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown; put?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/supplies"]?.get).toBeDefined();
    expect(document.paths["/supplies"]?.post).toBeDefined();
    expect(document.paths["/supplies/{supplyId}/suppliers"]?.put).toBeDefined();
  });
});
