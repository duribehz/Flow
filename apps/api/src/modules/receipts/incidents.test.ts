import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorHandler } from "@/shared/errors/error-handler.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Incident } from "./incidents.repo.js";

const actorId = "00000000-0000-4000-8000-000000000001";
const incidentId = "10000000-0000-4000-8000-000000000001";
const receiptId = "10000000-0000-4000-8000-000000000002";
const now = new Date("2026-10-24T12:00:00.000Z");
const incident: Incident = {
  id: incidentId,
  incidentNumber: "INC-001",
  receiptId,
  receiptItemId: null,
  type: "damaged",
  status: "open",
  description: "Partida dañada",
  reportedBy: { id: actorId, userName: "receiver" },
  assignedTo: null,
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: now,
  updatedAt: now,
};

const createIncidentUseCase = mock(
  async (_actorId: string, _input: unknown, _db: Executor) => incident,
);
const listIncidentsUseCase = mock(async (_filters: unknown, _db: Executor) => [incident]);
const getIncidentUseCase = mock(async (_id: string, _db: Executor) => incident);
const updateIncidentUseCase = mock(
  async (_id: string, _actorId: string, _input: unknown, _db: Executor) => incident,
);

mock.module("./use-cases/create-incident.usecase.js", () => ({ createIncidentUseCase }));
mock.module("./use-cases/list-incidents.usecase.js", () => ({ listIncidentsUseCase }));
mock.module("./use-cases/get-incident.usecase.js", () => ({ getIncidentUseCase }));
mock.module("./use-cases/update-incident.usecase.js", () => ({ updateIncidentUseCase }));

const { incidentsRouter } = await import("./incidents.router.js");

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", {} as Executor);
    context.set("userId", actorId);
    await next();
  });
  app.onError(errorHandler);
  app.route("/v1/incidents", incidentsRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  createIncidentUseCase.mockClear();
  listIncidentsUseCase.mockClear();
  getIncidentUseCase.mockClear();
  updateIncidentUseCase.mockClear();
});

describe("incident routes", () => {
  test("lists, creates and gets incidents", async () => {
    const app = createTestApp();
    const list = await app.request(`/v1/incidents?receiptId=${receiptId}&status=open`);
    const create = await app.request("/v1/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptId, type: "damaged", description: "Partida dañada" }),
    });
    const get = await app.request(`/v1/incidents/${incidentId}`);

    expect([list.status, create.status, get.status]).toEqual([200, 201, 200]);
    expect((await create.json()).data.receiptId).toBe(receiptId);
    expect(createIncidentUseCase).toHaveBeenCalledWith(
      actorId,
      { receiptId, type: "damaged", description: "Partida dañada" },
      expect.anything(),
    );
  });

  test("updates assignment and resolution state", async () => {
    const response = await createTestApp().request(`/v1/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "investigating", assignedTo: actorId }),
    });
    expect(response.status).toBe(200);
    expect(updateIncidentUseCase).toHaveBeenCalledWith(
      incidentId,
      actorId,
      { status: "investigating", assignedTo: actorId },
      expect.anything(),
    );
  });

  test("rejects an invalid payload and requires resolution before closing", async () => {
    const app = createTestApp();
    const invalid = await app.request("/v1/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptId, type: "unknown", description: "" }),
    });
    updateIncidentUseCase.mockImplementationOnce(async () => {
      throw new AppError(
        400,
        "INCIDENT_RESOLUTION_REQUIRED",
        "Resolution is required to resolve an incident",
      );
    });
    const noResolution = await app.request(`/v1/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });

    expect(invalid.status).toBe(400);
    expect(noResolution.status).toBe(400);
    expect((await noResolution.json()).error.code).toBe("INCIDENT_RESOLUTION_REQUIRED");
  });

  test("publishes incident routes in OpenAPI", async () => {
    const response = await createTestApp().request("/v1/openapi.json");
    const document = (await response.json()) as { paths: Record<string, unknown> };
    expect(document.paths).toHaveProperty("/v1/incidents");
    expect(document.paths).toHaveProperty("/v1/incidents/{incidentId}");
  });
});
