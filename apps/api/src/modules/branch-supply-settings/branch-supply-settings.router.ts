import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  branchSupplySettingDTO,
  branchSupplySettingParamsDTO,
  branchSupplySettingsParamsDTO,
  upsertBranchSupplySettingDTO,
} from "./branch-supply-settings.dto.js";
import type { BranchSupplySetting } from "./branch-supply-settings.repo.js";
import { getBranchSupplySettingUseCase } from "./use-cases/get-branch-supply-setting.usecase.js";
import { listBranchSupplySettingsUseCase } from "./use-cases/list-branch-supply-settings.usecase.js";
import { upsertBranchSupplySettingUseCase } from "./use-cases/upsert-branch-supply-setting.usecase.js";

const errors = {
  400: {
    description: "Invalid request",
    content: { "application/json": { schema: errorSchema } },
  },
  404: {
    description: "Branch, supply, usage purpose, or setting not found",
    content: { "application/json": { schema: errorSchema } },
  },
  409: {
    description: "Usage purpose is inactive",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

export const branchSupplySettingsRouter = new OpenAPIHono<State>({
  defaultHook: (result, ctx) => {
    if (!result.success) {
      return ctx.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

branchSupplySettingsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{branchId}/supply-settings",
    operationId: "getBranchSupplySettings",
    tags: ["Branch supply settings"],
    summary: "List a branch's supply settings",
    request: { params: branchSupplySettingsParamsDTO },
    responses: {
      200: {
        description: "Branch supply settings",
        content: {
          "application/json": { schema: z.object({ data: z.array(branchSupplySettingDTO) }) },
        },
      },
      400: errors[400],
    },
  }),
  async (ctx) => {
    const settings = await listBranchSupplySettingsUseCase(
      ctx.req.valid("param").branchId,
      ctx.get("db"),
    );
    return ctx.json({ data: settings.map(toResponse) }, 200);
  },
);

branchSupplySettingsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{branchId}/supply-settings/{supplyId}",
    operationId: "getBranchSupplySetting",
    tags: ["Branch supply settings"],
    summary: "Get a branch supply setting",
    request: { params: branchSupplySettingParamsDTO },
    responses: {
      200: {
        description: "Branch supply setting",
        content: { "application/json": { schema: z.object({ data: branchSupplySettingDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (ctx) => {
    const { branchId, supplyId } = ctx.req.valid("param");
    const setting = await getBranchSupplySettingUseCase(branchId, supplyId, ctx.get("db"));
    return ctx.json({ data: toResponse(setting) }, 200);
  },
);

branchSupplySettingsRouter.openapi(
  createRoute({
    method: "put",
    path: "/{branchId}/supply-settings/{supplyId}",
    operationId: "putBranchSupplySetting",
    tags: ["Branch supply settings"],
    summary: "Create or replace a branch supply setting",
    request: {
      params: branchSupplySettingParamsDTO,
      body: {
        required: true,
        content: { "application/json": { schema: upsertBranchSupplySettingDTO } },
      },
    },
    responses: {
      200: {
        description: "Branch supply setting saved",
        content: { "application/json": { schema: z.object({ data: branchSupplySettingDTO }) } },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (ctx) => {
    const { branchId, supplyId } = ctx.req.valid("param");
    const setting = await upsertBranchSupplySettingUseCase(
      branchId,
      supplyId,
      ctx.req.valid("json"),
      ctx.get("db"),
    );
    return ctx.json({ data: toResponse(setting) }, 200);
  },
);

function toResponse(setting: BranchSupplySetting) {
  return {
    ...setting,
    weeklyTargets: setting.weeklyTargets.toSorted((a, b) => a.weekday - b.weekday),
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}
