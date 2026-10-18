import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/http/openapi.js";
import type { Supplier } from "./suppliers.repo.js";
import { createSuppliersRoutes } from "./suppliers.js";

const supplier: Supplier = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Central de Abastos MX",
  phoneNumber: "+52 55 1234 5678",
  email: "ventas@central.example",
};

function createTestApp() {
  const app = new OpenAPIHono();
  const useCase = {
    async getSuppliers() {
      return [supplier];
    },
    async getSupplierById() {
      return supplier;
    },
    async createSupplier() {
      return supplier;
    },
  };

  app.onError(errorHandler);
  app.route("/suppliers", createSuppliersRoutes(useCase));
  configureOpenApi(app);

  return app;
}

describe("supplier routes", () => {
  test("lists suppliers", async () => {
    const response = await createTestApp().request("/suppliers");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [supplier] });
  });

  test("gets a supplier by ID", async () => {
    const response = await createTestApp().request(`/suppliers/${supplier.id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: supplier });
  });

  test("creates a supplier", async () => {
    const response = await createTestApp().request("/suppliers", {
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
    let receivedInput: unknown;
    const app = new OpenAPIHono();

    app.route(
      "/suppliers",
      createSuppliersRoutes({
        async getSuppliers() {
          return [];
        },
        async getSupplierById() {
          return supplier;
        },
        async createSupplier(input) {
          receivedInput = input;
          return supplier;
        },
      }),
    );

    const response = await app.request("/suppliers", {
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
    const response = await createTestApp().request("/suppliers/not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("rejects invalid creation input", async () => {
    const response = await createTestApp().request("/suppliers", {
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
    const response = await createTestApp().request("/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/suppliers"]?.get).toBeDefined();
    expect(document.paths["/suppliers"]?.post).toBeDefined();
    expect(document.paths["/suppliers/{supplierId}"]?.get).toBeDefined();
  });
});
