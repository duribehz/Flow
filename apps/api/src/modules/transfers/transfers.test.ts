import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Transfer } from "./transfers.repo.js";

const senderId = "00000000-0000-4000-8000-000000000001";
const sourceBranchId = "10000000-0000-4000-8000-000000000001";
const destinationBranchId = "10000000-0000-4000-8000-000000000002";
const transferId = "20000000-0000-4000-8000-000000000001";
const now = new Date("2026-11-14T12:00:00.000Z");

const transfer: Transfer = {
  id: transferId,
  transferNumber: "TRF-0001",
  fromBranch: { id: sourceBranchId, name: "Centro" },
  toBranch: { id: destinationBranchId, name: "Norte" },
  sentBusinessDate: "2026-11-14",
  status: "pending",
  sentBy: { id: senderId, userName: "manager" },
  acceptedBy: null,
  acceptedInventoryDayId: null,
  sentAt: now,
  acceptedAt: null,
  createdAt: now,
  items: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      supply: {
        id: "40000000-0000-4000-8000-000000000001",
        sku: "TOM-1",
        name: "Jitomate",
        unit: { symbol: "kg" },
      },
      quantity: 250,
    },
  ],
};

const createTransferUseCase = mock(async () => transfer);
const listTransfersUseCase = mock(async () => [transfer]);
const getTransferUseCase = mock(async () => transfer);
const acceptTransferUseCase = mock(async () => ({
  ...transfer,
  status: "accepted" as const,
  acceptedBy: { id: senderId, userName: "manager" },
  acceptedInventoryDayId: "50000000-0000-4000-8000-000000000001",
  acceptedAt: now,
}));
const listTransferBranchOptionsUseCase = mock(async () => [
  { id: sourceBranchId, name: "Centro" },
  { id: destinationBranchId, name: "Norte" },
]);

mock.module("./transfers.usecases.js", () => ({
  createTransferUseCase,
  listTransfersUseCase,
  getTransferUseCase,
  acceptTransferUseCase,
  cancelTransferUseCase: async () => ({}),
  listTransferBranchOptionsUseCase,
}));

const { transfersRouter } = await import("./transfers.router.js");
const testDb = {} as Executor;

function createTestApp(branchId = sourceBranchId) {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", testDb);
    context.set("userId", senderId);
    context.set("userName", "manager");
    context.set("userRole", "manager");
    context.set("branchId", branchId);
    context.set("sessionId", "60000000-0000-4000-8000-000000000001");
    context.set("sessionTokenHash", "test-hash");
    await next();
  });
  app.route("/v1/transfers", transfersRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  createTransferUseCase.mockClear();
  listTransfersUseCase.mockClear();
  getTransferUseCase.mockClear();
  acceptTransferUseCase.mockClear();
  listTransferBranchOptionsUseCase.mockClear();
});

describe("transfer routes", () => {
  test("lists transfer branch choices and the manager's outgoing transfers", async () => {
    const app = createTestApp();
    const branches = await app.request("/v1/transfers/branches");
    const outgoing = await app.request("/v1/transfers?direction=sent&status=pending");

    expect(branches.status).toBe(200);
    expect((await branches.json()).data).toHaveLength(2);
    expect(outgoing.status).toBe(200);
    expect(listTransfersUseCase).toHaveBeenCalledWith(
      { direction: "sent", status: "pending" },
      testDb,
      sourceBranchId,
    );
  });

  test("sends transfer lines from the manager's own branch", async () => {
    const response = await createTestApp().request("/v1/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toBranchId: destinationBranchId,
        businessDate: "2026-11-14",
        items: [{ supplyId: transfer.items[0]!.supply.id, quantity: 250 }],
      }),
    });

    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ status: "pending" });
    expect(createTransferUseCase).toHaveBeenCalledWith(
      senderId,
      {
        toBranchId: destinationBranchId,
        businessDate: "2026-11-14",
        items: [{ supplyId: transfer.items[0]!.supply.id, quantity: 250 }],
      },
      testDb,
      sourceBranchId,
    );
  });

  test("accepts a pending incoming transfer", async () => {
    const response = await createTestApp(destinationBranchId).request(
      `/v1/transfers/${transferId}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDate: "2026-11-14" }),
      },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ status: "accepted" });
    expect(acceptTransferUseCase).toHaveBeenCalledWith(
      transferId,
      senderId,
      { businessDate: "2026-11-14" },
      testDb,
      destinationBranchId,
    );
  });
});
