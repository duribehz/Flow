import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { branchesDto, branchIdParamsDto, createBranchDTO } from "./branches.dto.js";
import { createBranchUseCase } from "./use-cases/create-branch.usecase.js";
import { getBranchUseCase } from "./use-cases/get-branch.usecase.js";
import { getBranchesUseCase } from "./use-cases/get-branches.usecase.js";

export const branchesRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

branchesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getBranches",
    tags: ["Branches"],
    summary: "Get branches",
    responses: {
      200: {
        description: "List of branches",
        content: {
          "application/json": {
            schema: z.object({ data: z.array(branchesDto) }),
          },
        },
      },
    },
  }),
  async (ctx) => {
    const branches = await getBranchesUseCase(ctx.get("db"));

    return ctx.json({ data: branches }, 200);
  },
);

branchesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postBranches",
    tags: ["Branches"],
    summary: "Create a branch",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createBranchDTO } },
      },
    },
    responses: {
      201: {
        description: "Branch created",
        content: { "application/json": { schema: z.object({ data: branchesDto }) } },
      },
      400: {
        description: "Invalid request body",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const branch = await createBranchUseCase(ctx.req.valid("json"), ctx.get("db"));
    return ctx.json({ data: branch }, 201);
  },
);

branchesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{branchId}",
    operationId: "getBranchesBranchId",
    tags: ["Branches"],
    summary: "Get a branch by ID",
    request: { params: branchIdParamsDto },
    responses: {
      200: {
        description: "Branch",
        content: { "application/json": { schema: z.object({ data: branchesDto }) } },
      },
      400: {
        description: "Invalid branch ID",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Branch not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { branchId } = ctx.req.valid("param");
    const branch = await getBranchUseCase(branchId, ctx.get("db"));
    return ctx.json({ data: branch }, 200);
  },
);
