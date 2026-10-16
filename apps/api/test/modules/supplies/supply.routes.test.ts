import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { createSupplyRoutes } from "@/modules/supplies/presentation/http/supply.routes.js";
import { errorHandler } from "@/shared/presentation/http/error-handler.js";
import { configureOpenApi } from "@/shared/presentation/http/openapi.js";

const createSupplyInput = {
  sku: "COC-001",
  name: "Aceite vegetal",
  description: "Aceite para cocina",
  unitId: "10000000-0000-4000-8000-000000000001",
  unitCost: 4200,
  categoryId: "20000000-0000-4000-8000-000000000001",
  supplierIds: ["40000000-0000-4000-8000-000000000001", "40000000-0000-4000-8000-000000000002"],
  active: true,
};

const supply = {
  id: "30000000-0000-4000-8000-000000000001",
  sku: createSupplyInput.sku,
  name: createSupplyInput.name,
  description: createSupplyInput.description,
  unitCost: createSupplyInput.unitCost,
  active: createSupplyInput.active,
  category: { id: createSupplyInput.categoryId, name: "Aceites" },
  unit: { id: createSupplyInput.unitId, name: "Litro", symbol: "L" },
  suppliers: [
    { id: createSupplyInput.supplierIds[0]!, name: "Central de Abastos MX" },
    { id: createSupplyInput.supplierIds[1]!, name: "Distribuidora Gourmet" },
  ],
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

const supplyResponse = {
  ...supply,
  createdAt: "2026-10-13T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
};

function createTestApp() {
  const app = new OpenAPIHono();

  app.onError(errorHandler);
  app.route(
    "/supplies",
    createSupplyRoutes({
      list: {
        async execute() {
          return [supply];
        },
      },
      create: {
        async execute() {
          return supply;
        },
      },
      replaceSuppliers: {
        async execute() {
          return supply;
        },
      },
    }),
  );
  configureOpenApi(app);

  return app;
}

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
      createSupplyRoutes({
        list: {
          async execute() {
            return [];
          },
        },
        create: {
          async execute(input) {
            receivedInput = input;
            return supply;
          },
        },
        replaceSuppliers: {
          async execute() {
            return supply;
          },
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
