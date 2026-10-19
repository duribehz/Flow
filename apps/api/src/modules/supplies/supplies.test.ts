import { describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateSupplyInput } from "./supplies.dto.js";
import type { Supply } from "./supplies.repo.js";

const createSupplyInput: CreateSupplyInput = {
  sku: "COC-001",
  name: "Aceite vegetal",
  description: "Aceite para cocina",
  unitId: "10000000-0000-4000-8000-000000000001",
  unitCost: 4200,
  categoryId: "20000000-0000-4000-8000-000000000001",
  supplierIds: ["40000000-0000-4000-8000-000000000001", "40000000-0000-4000-8000-000000000002"],
  active: true,
};

const supply: Supply = {
  id: "30000000-0000-4000-8000-000000000001",
  sku: createSupplyInput.sku,
  name: createSupplyInput.name,
  description: createSupplyInput.description ?? null,
  unitCost: createSupplyInput.unitCost ?? 0,
  active: createSupplyInput.active ?? true,
  category: {
    id: createSupplyInput.categoryId,
    name: "Aceites",
  },
  unit: {
    id: createSupplyInput.unitId,
    name: "Litro",
    symbol: "L",
  },
  suppliers: [
    {
      id: createSupplyInput.supplierIds[0]!,
      name: "Central de Abastos MX",
    },
    {
      id: createSupplyInput.supplierIds[1]!,
      name: "Distribuidora Gourmet",
    },
  ],
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

let receivedCreateInput: CreateSupplyInput | undefined;
const getSuppliesMock = mock(async () => [supply]);
const createSupplyMock = mock(async (input: CreateSupplyInput) => {
  receivedCreateInput = input;
  return supply;
});
const replaceSupplySuppliersMock = mock(async () => supply);

mock.module("./use-cases/get-supplies.usecase.js", () => ({
  getSuppliesUseCase: getSuppliesMock,
}));
mock.module("./use-cases/create-supply.usecase.js", () => ({
  createSupplyUseCase: createSupplyMock,
}));
mock.module("./use-cases/replace-supply-suppliers.usecase.js", () => ({
  replaceSupplySuppliersUseCase: replaceSupplySuppliersMock,
}));

const { suppliesRouter } = await import("./supplies.router.js");
const testDb = {} as Executor;

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.use("*", async (ctx, next) => {
    ctx.set("db", testDb);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/supplies", suppliesRouter);
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
    const response = await createTestApp().request("/v1/supplies");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [supplyResponse] });
    expect(getSuppliesMock).toHaveBeenCalledWith(testDb);
  });

  test("creates a supply", async () => {
    const response = await createTestApp().request("/v1/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createSupplyInput),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: supplyResponse });
    expect(createSupplyMock).toHaveBeenCalledWith(createSupplyInput, testDb);
  });

  test("applies defaults when creating a supply", async () => {
    receivedCreateInput = undefined;
    const response = await createTestApp().request("/v1/supplies", {
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
    expect(receivedCreateInput).toMatchObject({ unitCost: 0, active: true });
  });

  test("rejects invalid input", async () => {
    const response = await createTestApp().request("/v1/supplies", {
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
    const response = await createTestApp().request("/v1/supplies", {
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
    const response = await createTestApp().request(`/v1/supplies/${supply.id}/suppliers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierIds: createSupplyInput.supplierIds }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: supplyResponse });
    expect(replaceSupplySuppliersMock).toHaveBeenCalledWith(
      supply.id,
      createSupplyInput.supplierIds,
      testDb,
    );
  });

  test("rejects duplicate suppliers when replacing", async () => {
    const supplierId = createSupplyInput.supplierIds[0]!;
    const response = await createTestApp().request(`/v1/supplies/${supply.id}/suppliers`, {
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
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown; put?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/v1/supplies"]?.get).toBeDefined();
    expect(document.paths["/v1/supplies"]?.post).toBeDefined();
    expect(document.paths["/v1/supplies/{supplyId}/suppliers"]?.put).toBeDefined();
  });
});
