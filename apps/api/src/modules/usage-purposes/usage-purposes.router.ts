import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  createUsagePurposeSchema,
  editUsagePurposeSchema,
  listUsagePurposesQuerySchema,
  usagePurposeIdParamsSchema,
  usagePurposeSchema,
} from "./usage-purposes.dto.js";
import type { UsagePurpose } from "./usage-purposes.repo.js";
import { createUsagePurposeUseCase } from "./use-cases/create-usage-purpose.usecase.js";
import { editUsagePurposeUseCase } from "./use-cases/edit-usage-purpose.usecase.js";
import { getUsagePurposeUseCase } from "./use-cases/get-usage-purpose.usecase.js";
import { getUsagePurposesUseCase } from "./use-cases/get-usage-purposes.usecase.js";

export const usagePurposesRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

usagePurposesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getUsagePurposes",
    tags: ["Usage Purposes"],
    summary: "List usage purposes",
    request: { query: listUsagePurposesQuerySchema },
    responses: {
      200: {
        description: "Usage purposes",
        content: {
          "application/json": { schema: z.object({ data: z.array(usagePurposeSchema) }) },
        },
      },
      400: {
        description: "Invalid query",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const usagePurposes = await getUsagePurposesUseCase(ctx.req.valid("query"), ctx.get("db"));
    return ctx.json({ data: usagePurposes.map(toUsagePurposeResponse) }, 200);
  },
);

usagePurposesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{usagePurposeId}",
    operationId: "getUsagePurposesUsagePurposeId",
    tags: ["Usage Purposes"],
    summary: "Get a usage purpose",
    request: { params: usagePurposeIdParamsSchema },
    responses: {
      200: {
        description: "Usage purpose",
        content: { "application/json": { schema: z.object({ data: usagePurposeSchema }) } },
      },
      400: {
        description: "Invalid usage purpose ID",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Usage purpose not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { usagePurposeId } = ctx.req.valid("param");
    const usagePurpose = await getUsagePurposeUseCase(usagePurposeId, ctx.get("db"));
    return ctx.json({ data: toUsagePurposeResponse(usagePurpose) }, 200);
  },
);

usagePurposesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postUsagePurposes",
    tags: ["Usage Purposes"],
    summary: "Create a usage purpose",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createUsagePurposeSchema } },
      },
    },
    responses: {
      201: {
        description: "Usage purpose created",
        content: { "application/json": { schema: z.object({ data: usagePurposeSchema }) } },
      },
      400: {
        description: "Invalid request body",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "Usage purpose name already exists",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const usagePurpose = await createUsagePurposeUseCase(ctx.req.valid("json"), ctx.get("db"));
    return ctx.json({ data: toUsagePurposeResponse(usagePurpose) }, 201);
  },
);

usagePurposesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{usagePurposeId}",
    operationId: "patchUsagePurposesUsagePurposeId",
    tags: ["Usage Purposes"],
    summary: "Edit a usage purpose",
    request: {
      params: usagePurposeIdParamsSchema,
      body: {
        required: true,
        content: { "application/json": { schema: editUsagePurposeSchema } },
      },
    },
    responses: {
      200: {
        description: "Usage purpose edited",
        content: { "application/json": { schema: z.object({ data: usagePurposeSchema }) } },
      },
      400: {
        description: "Invalid usage purpose ID or request body",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Usage purpose not found",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "Usage purpose name already exists",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (ctx) => {
    const { usagePurposeId } = ctx.req.valid("param");
    const usagePurpose = await editUsagePurposeUseCase(
      usagePurposeId,
      ctx.req.valid("json"),
      ctx.get("db"),
    );
    return ctx.json({ data: toUsagePurposeResponse(usagePurpose) }, 200);
  },
);

function toUsagePurposeResponse(usagePurpose: UsagePurpose) {
  return {
    ...usagePurpose,
    createdAt: usagePurpose.createdAt.toISOString(),
  };
}
