import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateBranchInput } from "./branches.repo.js";

const branches = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Sucursal Centro" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Sucursal Norte" },
];

let receivedInput: CreateBranchInput | undefined;

const createBranchUseCase = mock(async (input: CreateBranchInput, _db: Executor) => {
  receivedInput = input;
  return branches[0];
});

const getBranchesUseCase = mock(async (_db: Executor) => branches);
const getBranchUseCase = mock(async (branchId: string, _db: Executor) => {
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) {
    throw new AppError(404, "BRANCH_NOT_FOUND", "Branch not found");
  }
  return branch;
});

mock.module("./use-cases/create-branch.usecase.js", () => ({ createBranchUseCase }));
mock.module("./use-cases/get-branches.usecase.js", () => ({ getBranchesUseCase }));
mock.module("./use-cases/get-branch.usecase.js", () => ({ getBranchUseCase }));

const { branchesRouter } = await import("./branches.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();

  app.use("*", async (ctx, next) => {
    ctx.set("db", {} as Executor);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/branches", branchesRouter);
  configureOpenApi(app);

  return app;
}

beforeEach(() => {
  receivedInput = undefined;
  createBranchUseCase.mockClear();
  getBranchesUseCase.mockClear();
  getBranchUseCase.mockClear();
});

describe("branch routes", () => {
  test("lists branches", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/branches");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: branches });
    expect(getBranchesUseCase).toHaveBeenCalledTimes(1);
  });

  test("creates a branch", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Sucursal Centro" }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: branches[0] });
    expect(receivedInput).toEqual({ name: "Sucursal Centro" });
    expect(createBranchUseCase).toHaveBeenCalledTimes(1);
  });

  test("rejects an empty name with a validation error", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request" },
    });
    expect(createBranchUseCase).not.toHaveBeenCalled();
  });

  test("gets a branch by ID", async () => {
    const app = createTestApp();
    const response = await app.request(`/v1/branches/${branches[0].id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: branches[0] });
    expect(getBranchUseCase).toHaveBeenCalledTimes(1);
  });

  test("returns 404 when the branch does not exist", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/branches/00000000-0000-4000-8000-000000000000");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "BRANCH_NOT_FOUND", message: "Branch not found" },
    });
  });

  test("rejects an invalid branch id with a validation error", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/branches/not-a-uuid");

    expect(response.status).toBe(400);
    expect(getBranchUseCase).not.toHaveBeenCalled();
  });
});
