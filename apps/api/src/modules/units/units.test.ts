import { describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Unit } from "./units.repo.js";

const unit: Unit = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Kilogramo",
  symbol: "kg",
  active: true,
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

let receivedInput: unknown;

mock.module("./use-cases/get-units.usecase.js", () => ({
  async getUnitsUseCase() {
    return [unit];
  },
}));

mock.module("./use-cases/get-unit.usecase.js", () => ({
  async getUnitUseCase() {
    return unit;
  },
}));

mock.module("./use-cases/create-unit.usecase.js", () => ({
  async createUnitUseCase(input: unknown) {
    receivedInput = input;
    return unit;
  },
}));

const { unitsRouter } = await import("./units.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.onError(errorHandler);
  app.route("/v1/units", unitsRouter);
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
    const response = await createTestApp().request("/v1/units");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [unitResponse] });
  });

  test("gets a unit by ID", async () => {
    const response = await createTestApp().request(`/v1/units/${unit.id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: unitResponse });
  });

  test("creates a unit", async () => {
    const response = await createTestApp().request("/v1/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: unit.name, symbol: unit.symbol }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: unitResponse });
  });

  test("normalizes input and defaults active to true", async () => {
    receivedInput = undefined;

    const response = await createTestApp().request("/v1/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${unit.name}  `, symbol: `  ${unit.symbol}  ` }),
    });

    expect(response.status).toBe(201);
    expect(receivedInput).toEqual({ name: unit.name, symbol: unit.symbol, active: true });
  });

  test("rejects an invalid unit ID", async () => {
    const response = await createTestApp().request("/v1/units/not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
  });

  test("rejects invalid creation input", async () => {
    const response = await createTestApp().request("/v1/units", {
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
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/v1/units"]?.get).toBeDefined();
    expect(document.paths["/v1/units"]?.post).toBeDefined();
    expect(document.paths["/v1/units/{unitId}"]?.get).toBeDefined();
  });
});
