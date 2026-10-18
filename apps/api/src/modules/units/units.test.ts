import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/http/openapi.js";
import type { Unit } from "./units.repo.js";
import { createUnitsRoutes } from "./units.js";

const unit: Unit = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Kilogramo",
  symbol: "kg",
  active: true,
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

function createTestApp() {
  const app = new OpenAPIHono();
  const useCase = {
    async getUnits() {
      return [unit];
    },
    async getUnitById() {
      return unit;
    },
    async createUnit() {
      return unit;
    },
  };

  app.onError(errorHandler);
  app.route("/units", createUnitsRoutes(useCase));
  configureOpenApi(app);

  return app;
}

const unitResponse = {
  ...unit,
  createdAt: "2026-10-13T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
};

describe("unit routes", () => {
  test("lists units", async () => {
    const response = await createTestApp().request("/units");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [unitResponse] });
  });

  test("gets a unit by ID", async () => {
    const response = await createTestApp().request(`/units/${unit.id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: unitResponse });
  });

  test("creates a unit", async () => {
    const response = await createTestApp().request("/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: unit.name, symbol: unit.symbol }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: unitResponse });
  });

  test("normalizes input and defaults active to true", async () => {
    let receivedInput: unknown;
    const app = new OpenAPIHono();

    app.route(
      "/units",
      createUnitsRoutes({
        async getUnits() {
          return [];
        },
        async getUnitById() {
          return unit;
        },
        async createUnit(input) {
          receivedInput = input;
          return unit;
        },
      }),
    );

    const response = await app.request("/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${unit.name}  `, symbol: `  ${unit.symbol}  ` }),
    });

    expect(response.status).toBe(201);
    expect(receivedInput).toEqual({ name: unit.name, symbol: unit.symbol, active: true });
  });

  test("rejects an invalid unit ID", async () => {
    const response = await createTestApp().request("/units/not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("rejects invalid creation input", async () => {
    const response = await createTestApp().request("/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", symbol: "" }),
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
    expect(document.paths["/units"]?.get).toBeDefined();
    expect(document.paths["/units"]?.post).toBeDefined();
    expect(document.paths["/units/{unitId}"]?.get).toBeDefined();
  });
});
