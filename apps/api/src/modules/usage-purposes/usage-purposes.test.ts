import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type {
  CreateUsagePurposeInput,
  EditUsagePurposeInput,
  ListUsagePurposesQuery,
} from "./usage-purposes.dto.js";
import type { UsagePurpose } from "./usage-purposes.repo.js";

const usagePurpose: UsagePurpose = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Consumo interno",
  description: "Uso dentro de la sucursal",
  active: true,
  createdAt: new Date("2026-10-24T10:00:00.000Z"),
};

let receivedFilters: ListUsagePurposesQuery | undefined;
let receivedCreateInput: CreateUsagePurposeInput | undefined;
let receivedEditInput: EditUsagePurposeInput | undefined;
let receivedUsagePurposeId: string | undefined;
let getError: AppError | undefined;
let createError: AppError | undefined;
let editError: AppError | undefined;

const getUsagePurposesUseCase = mock(async (filters: ListUsagePurposesQuery, _db: Executor) => {
  receivedFilters = filters;
  return [usagePurpose];
});
const getUsagePurposeUseCase = mock(async (usagePurposeId: string, _db: Executor) => {
  receivedUsagePurposeId = usagePurposeId;
  if (getError) throw getError;
  return usagePurpose;
});
const createUsagePurposeUseCase = mock(async (input: CreateUsagePurposeInput, _db: Executor) => {
  receivedCreateInput = input;
  if (createError) throw createError;
  return usagePurpose;
});
const editUsagePurposeUseCase = mock(
  async (usagePurposeId: string, input: EditUsagePurposeInput, _db: Executor) => {
    receivedUsagePurposeId = usagePurposeId;
    receivedEditInput = input;
    if (editError) throw editError;
    return { ...usagePurpose, ...input };
  },
);

mock.module("./use-cases/get-usage-purposes.usecase.js", () => ({ getUsagePurposesUseCase }));
mock.module("./use-cases/get-usage-purpose.usecase.js", () => ({ getUsagePurposeUseCase }));
mock.module("./use-cases/create-usage-purpose.usecase.js", () => ({ createUsagePurposeUseCase }));
mock.module("./use-cases/edit-usage-purpose.usecase.js", () => ({ editUsagePurposeUseCase }));

const { usagePurposesRouter } = await import("./usage-purposes.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.use("*", async (ctx, next) => {
    ctx.set("db", {} as Executor);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/usage-purposes", usagePurposesRouter);
  configureOpenApi(app);

  return app;
}

const usagePurposeResponse = {
  ...usagePurpose,
  createdAt: "2026-10-24T10:00:00.000Z",
};

beforeEach(() => {
  receivedFilters = undefined;
  receivedCreateInput = undefined;
  receivedEditInput = undefined;
  receivedUsagePurposeId = undefined;
  getError = undefined;
  createError = undefined;
  editError = undefined;
  getUsagePurposesUseCase.mockClear();
  getUsagePurposeUseCase.mockClear();
  createUsagePurposeUseCase.mockClear();
  editUsagePurposeUseCase.mockClear();
});

describe("usage purpose routes", () => {
  test("lists usage purposes", async () => {
    const response = await createTestApp().request("/v1/usage-purposes");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [usagePurposeResponse] });
    expect(receivedFilters).toEqual({});
  });

  test("filters usage purposes by active status", async () => {
    const response = await createTestApp().request("/v1/usage-purposes?active=false");

    expect(response.status).toBe(200);
    expect(receivedFilters).toEqual({ active: false });
  });

  test("rejects an invalid active filter", async () => {
    const response = await createTestApp().request("/v1/usage-purposes?active=1");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
    expect(getUsagePurposesUseCase).not.toHaveBeenCalled();
  });

  test("gets a usage purpose by ID", async () => {
    const response = await createTestApp().request(`/v1/usage-purposes/${usagePurpose.id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: usagePurposeResponse });
    expect(receivedUsagePurposeId).toBe(usagePurpose.id);
  });

  test("rejects an invalid usage purpose ID", async () => {
    const response = await createTestApp().request("/v1/usage-purposes/not-a-uuid");

    expect(response.status).toBe(400);
    expect(getUsagePurposeUseCase).not.toHaveBeenCalled();
  });

  test("returns 404 when a usage purpose does not exist", async () => {
    getError = new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Usage purpose not found");

    const response = await createTestApp().request(`/v1/usage-purposes/${usagePurpose.id}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "USAGE_PURPOSE_NOT_FOUND", message: "Usage purpose not found" },
    });
  });

  test("creates a usage purpose with normalized defaults", async () => {
    const response = await createTestApp().request("/v1/usage-purposes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "  Consumo interno  ",
        description: "  Uso dentro de la sucursal  ",
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: usagePurposeResponse });
    expect(receivedCreateInput).toEqual({
      name: "Consumo interno",
      description: "Uso dentro de la sucursal",
      active: true,
    });
  });

  test("rejects invalid creation input", async () => {
    const response = await createTestApp().request("/v1/usage-purposes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });

    expect(response.status).toBe(400);
    expect(createUsagePurposeUseCase).not.toHaveBeenCalled();
  });

  test("returns 409 when the create name conflicts", async () => {
    createError = new AppError(
      409,
      "USAGE_PURPOSE_NAME_CONFLICT",
      "A usage purpose with this name already exists",
    );

    const response = await createTestApp().request("/v1/usage-purposes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: usagePurpose.name }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "USAGE_PURPOSE_NAME_CONFLICT",
        message: "A usage purpose with this name already exists",
      },
    });
  });

  test("edits a usage purpose", async () => {
    const response = await createTestApp().request(`/v1/usage-purposes/${usagePurpose.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Venta directa  ", description: null, active: false }),
    });

    expect(response.status).toBe(200);
    expect(receivedUsagePurposeId).toBe(usagePurpose.id);
    expect(receivedEditInput).toEqual({
      name: "Venta directa",
      description: null,
      active: false,
    });
    expect(await response.json()).toEqual({
      data: {
        ...usagePurposeResponse,
        name: "Venta directa",
        description: null,
        active: false,
      },
    });
  });

  test("rejects an empty edit", async () => {
    const response = await createTestApp().request(`/v1/usage-purposes/${usagePurpose.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect(editUsagePurposeUseCase).not.toHaveBeenCalled();
  });

  test("returns 404 when editing a missing usage purpose", async () => {
    editError = new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Usage purpose not found");

    const response = await createTestApp().request(`/v1/usage-purposes/${usagePurpose.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "USAGE_PURPOSE_NOT_FOUND", message: "Usage purpose not found" },
    });
  });

  test("returns 409 when the edited name conflicts", async () => {
    editError = new AppError(
      409,
      "USAGE_PURPOSE_NAME_CONFLICT",
      "A usage purpose with this name already exists",
    );

    const response = await createTestApp().request(`/v1/usage-purposes/${usagePurpose.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Otro uso" }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "USAGE_PURPOSE_NAME_CONFLICT",
        message: "A usage purpose with this name already exists",
      },
    });
  });

  test("publishes all operations in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<
        string,
        {
          get?: { operationId?: string };
          post?: { operationId?: string };
          patch?: { operationId?: string };
        }
      >;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/v1/usage-purposes"]?.get?.operationId).toBe("getUsagePurposes");
    expect(document.paths["/v1/usage-purposes"]?.post?.operationId).toBe("postUsagePurposes");
    expect(document.paths["/v1/usage-purposes/{usagePurposeId}"]?.get?.operationId).toBe(
      "getUsagePurposesUsagePurposeId",
    );
    expect(document.paths["/v1/usage-purposes/{usagePurposeId}"]?.patch?.operationId).toBe(
      "patchUsagePurposesUsagePurposeId",
    );
  });
});
