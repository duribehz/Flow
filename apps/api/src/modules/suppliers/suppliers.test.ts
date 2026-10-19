import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateSupplierInput, Supplier } from "./suppliers.repo.js";

const supplier: Supplier = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Central de Abastos MX",
  phoneNumber: "+52 55 1234 5678",
  email: "ventas@central.example",
};

let receivedInput: CreateSupplierInput | undefined;

const getSuppliersUseCase = mock(async (_db: Executor) => [supplier]);
const getSupplierUseCase = mock(async (_supplierId: string, _db: Executor) => supplier);
const createSupplierUseCase = mock(async (input: CreateSupplierInput, _db: Executor) => {
  receivedInput = input;
  return supplier;
});

mock.module("./use-cases/get-suppliers.usecase.js", () => ({ getSuppliersUseCase }));
mock.module("./use-cases/get-supplier.usecase.js", () => ({ getSupplierUseCase }));
mock.module("./use-cases/create-supplier.usecase.js", () => ({ createSupplierUseCase }));

const { suppliersRouter } = await import("./suppliers.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.use("*", async (ctx, next) => {
    ctx.set("db", {} as Executor);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/suppliers", suppliersRouter);
  configureOpenApi(app);

  return app;
}

beforeEach(() => {
  receivedInput = undefined;
  getSuppliersUseCase.mockClear();
  getSupplierUseCase.mockClear();
  createSupplierUseCase.mockClear();
});

describe("supplier routes", () => {
  test("lists suppliers", async () => {
    const response = await createTestApp().request("/v1/suppliers");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [supplier] });
  });

  test("gets a supplier by ID", async () => {
    const response = await createTestApp().request(`/v1/suppliers/${supplier.id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: supplier });
  });

  test("creates a supplier", async () => {
    const response = await createTestApp().request("/v1/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: supplier.name,
        phoneNumber: supplier.phoneNumber,
        email: supplier.email,
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: supplier });
  });

  test("normalizes creation input", async () => {
    const response = await createTestApp().request("/v1/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `  ${supplier.name}  `,
        phoneNumber: `  ${supplier.phoneNumber}  `,
        email: "  VENTAS@CENTRAL.EXAMPLE  ",
      }),
    });

    expect(response.status).toBe(201);
    expect(receivedInput).toEqual({
      name: supplier.name,
      phoneNumber: supplier.phoneNumber,
      email: supplier.email,
    });
  });

  test("rejects an invalid supplier ID", async () => {
    const response = await createTestApp().request("/v1/suppliers/not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("rejects invalid creation input", async () => {
    const response = await createTestApp().request("/v1/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: supplier.name, email: "invalid-email" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("publishes all operations in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/v1/suppliers"]?.get).toBeDefined();
    expect(document.paths["/v1/suppliers"]?.post).toBeDefined();
    expect(document.paths["/v1/suppliers/{supplierId}"]?.get).toBeDefined();
  });
});
