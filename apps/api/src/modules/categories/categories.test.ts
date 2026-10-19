import { describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Category } from "./categories.repo.js";

const category: Category = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Aceites",
};

let receivedInput: unknown;

mock.module("./use-cases/get-categories.usecase.js", () => ({
  async getCategoriesUseCase() {
    return [category];
  },
}));

mock.module("./use-cases/create-category.usecase.js", () => ({
  async createCategoryUseCase(input: unknown) {
    receivedInput = input;
    return category;
  },
}));

const { categoriesRouter } = await import("./categories.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.onError(errorHandler);
  app.route("/v1/categories", categoriesRouter);
  configureOpenApi(app);

  return app;
}

describe("category routes", () => {
  test("lists categories", async () => {
    const response = await createTestApp().request("/v1/categories");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [category] });
  });

  test("creates a category", async () => {
    const response = await createTestApp().request("/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: category.name }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: category });
  });

  test("trims the category name", async () => {
    receivedInput = undefined;
    const response = await createTestApp().request("/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${category.name}  ` }),
    });

    expect(response.status).toBe(201);
    expect(receivedInput).toEqual({ name: category.name });
  });

  test("rejects an empty name", async () => {
    const response = await createTestApp().request("/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
    });
  });

  test("publishes list and create operations in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/v1/categories"]?.get).toBeDefined();
    expect(document.paths["/v1/categories"]?.post).toBeDefined();
  });
});
