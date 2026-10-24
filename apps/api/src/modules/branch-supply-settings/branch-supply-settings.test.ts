import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";

const branchId = "10000000-0000-4000-8000-000000000001";
const supplyId = "10000000-0000-4000-8000-000000000002";
const purposeId = "10000000-0000-4000-8000-000000000003";
const now = new Date("2026-10-24T12:00:00.000Z");

const setting = {
  id: "10000000-0000-4000-8000-000000000004",
  branchId,
  supplyId,
  mode: "fixed" as const,
  defaultUsagePurposeId: purposeId,
  active: true,
  createdAt: now,
  updatedAt: now,
  weeklyTargets: [
    { weekday: 5, targetQuantity: 0 },
    { weekday: 1, targetQuantity: 20 },
  ],
};

let receivedUpsert: unknown;
const listBranchSupplySettingsUseCase = mock(async () => [setting]);
const getBranchSupplySettingUseCase = mock(async () => setting);
const upsertBranchSupplySettingUseCase = mock(
  async (_branchId: string, _supplyId: string, input: unknown) => {
    receivedUpsert = input;
    return { ...setting, ...(input as object) };
  },
);

mock.module("./use-cases/list-branch-supply-settings.usecase.js", () => ({
  listBranchSupplySettingsUseCase,
}));
mock.module("./use-cases/get-branch-supply-setting.usecase.js", () => ({
  getBranchSupplySettingUseCase,
}));
mock.module("./use-cases/upsert-branch-supply-setting.usecase.js", () => ({
  upsertBranchSupplySettingUseCase,
}));

const { branchSupplySettingsRouter } = await import("./branch-supply-settings.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (ctx, next) => {
    ctx.set("db", {} as Executor);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/branches", branchSupplySettingsRouter);
  configureOpenApi(app);
  return app;
}

function put(body: unknown, path = `/v1/branches/${branchId}/supply-settings/${supplyId}`) {
  return createTestApp().request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  receivedUpsert = undefined;
  listBranchSupplySettingsUseCase.mockClear();
  getBranchSupplySettingUseCase.mockClear();
  upsertBranchSupplySettingUseCase.mockClear();
});

describe("branch supply settings routes", () => {
  test("lists settings and orders weekly targets", async () => {
    const response = await createTestApp().request(`/v1/branches/${branchId}/supply-settings`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        {
          ...setting,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          weeklyTargets: [
            { weekday: 1, targetQuantity: 20 },
            { weekday: 5, targetQuantity: 0 },
          ],
        },
      ],
    });
    expect(listBranchSupplySettingsUseCase).toHaveBeenCalledWith(branchId, expect.anything());
  });

  test("gets one setting from the nested branch path", async () => {
    const response = await createTestApp().request(
      `/v1/branches/${branchId}/supply-settings/${supplyId}`,
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.id).toBe(setting.id);
    expect(getBranchSupplySettingUseCase).toHaveBeenCalledWith(
      branchId,
      supplyId,
      expect.anything(),
    );
  });

  test("replaces a fixed setting and accepts a zero target", async () => {
    const body = {
      mode: "fixed",
      defaultUsagePurposeId: purposeId,
      active: true,
      weeklyTargets: [{ weekday: 7, targetQuantity: 0 }],
    };
    const response = await put(body);

    expect(response.status).toBe(200);
    expect(receivedUpsert).toEqual(body);
    expect((await response.json()).data.weeklyTargets).toEqual([{ weekday: 7, targetQuantity: 0 }]);
  });

  test("accepts on-demand only with an empty target array", async () => {
    const body = {
      mode: "on_demand",
      defaultUsagePurposeId: purposeId,
      active: false,
      weeklyTargets: [],
    };
    const response = await put(body);

    expect(response.status).toBe(200);
    expect(receivedUpsert).toEqual(body);
  });

  test("rejects fixed without targets and on-demand with targets", async () => {
    const fixed = await put({
      mode: "fixed",
      defaultUsagePurposeId: purposeId,
      active: true,
      weeklyTargets: [],
    });
    const onDemand = await put({
      mode: "on_demand",
      defaultUsagePurposeId: purposeId,
      active: true,
      weeklyTargets: [{ weekday: 1, targetQuantity: 0 }],
    });

    expect([fixed.status, onDemand.status]).toEqual([400, 400]);
    expect(upsertBranchSupplySettingUseCase).not.toHaveBeenCalled();
  });

  test("rejects duplicate and out-of-range weekdays", async () => {
    const duplicate = await put({
      mode: "fixed",
      defaultUsagePurposeId: purposeId,
      active: true,
      weeklyTargets: [
        { weekday: 2, targetQuantity: 1 },
        { weekday: 2, targetQuantity: 2 },
      ],
    });
    const invalidWeekday = await put({
      mode: "fixed",
      defaultUsagePurposeId: purposeId,
      active: true,
      weeklyTargets: [{ weekday: 8, targetQuantity: 1 }],
    });

    expect([duplicate.status, invalidWeekday.status]).toEqual([400, 400]);
    expect(upsertBranchSupplySettingUseCase).not.toHaveBeenCalled();
  });

  test("rejects negative, fractional, and unsafe quantities", async () => {
    const statuses = await Promise.all(
      [-1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(
        async (targetQuantity) =>
          (
            await put({
              mode: "fixed",
              defaultUsagePurposeId: purposeId,
              active: true,
              weeklyTargets: [{ weekday: 1, targetQuantity }],
            })
          ).status,
      ),
    );

    expect(statuses).toEqual([400, 400, 400]);
    expect(upsertBranchSupplySettingUseCase).not.toHaveBeenCalled();
  });

  test("requires the complete body and valid path UUIDs", async () => {
    const incomplete = await put({
      mode: "on_demand",
      defaultUsagePurposeId: purposeId,
      weeklyTargets: [],
    });
    const invalidPath = await put(
      {
        mode: "on_demand",
        defaultUsagePurposeId: purposeId,
        active: true,
        weeklyTargets: [],
      },
      "/v1/branches/not-a-uuid/supply-settings/not-a-uuid",
    );

    expect([incomplete.status, invalidPath.status]).toEqual([400, 400]);
    expect(upsertBranchSupplySettingUseCase).not.toHaveBeenCalled();
  });

  test("returns domain errors through the global handler", async () => {
    upsertBranchSupplySettingUseCase.mockImplementationOnce(async () => {
      throw new AppError(409, "USAGE_PURPOSE_INACTIVE", "Usage purpose is inactive");
    });
    const response = await put({
      mode: "on_demand",
      defaultUsagePurposeId: purposeId,
      active: true,
      weeklyTargets: [],
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "USAGE_PURPOSE_INACTIVE", message: "Usage purpose is inactive" },
    });
  });

  test("publishes list, get, and put operations in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, Record<string, { operationId?: string }>>;
    };

    const listPath = document.paths["/v1/branches/{branchId}/supply-settings"];
    const detailPath = document.paths["/v1/branches/{branchId}/supply-settings/{supplyId}"];
    expect(listPath?.get.operationId).toBe("getBranchSupplySettings");
    expect(detailPath?.get.operationId).toBe("getBranchSupplySetting");
    expect(detailPath?.put.operationId).toBe("putBranchSupplySetting");
  });
});
