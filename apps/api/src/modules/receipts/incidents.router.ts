import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  createIncidentDTO,
  incidentDTO,
  incidentIdParamsDTO,
  incidentListQueryDTO,
  updateIncidentDTO,
} from "./incidents.dto.js";
import { createIncidentUseCase } from "./use-cases/create-incident.usecase.js";
import { getIncidentUseCase } from "./use-cases/get-incident.usecase.js";
import { listIncidentsUseCase } from "./use-cases/list-incidents.usecase.js";
import { updateIncidentUseCase } from "./use-cases/update-incident.usecase.js";

export const incidentsRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

const errors = {
  400: {
    description: "Invalid incident data",
    content: { "application/json": { schema: errorSchema } },
  },
  404: {
    description: "Incident or receipt not found",
    content: { "application/json": { schema: errorSchema } },
  },
};

incidentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getIncidents",
    tags: ["Incidents"],
    summary: "List incidents",
    request: { query: incidentListQueryDTO },
    responses: {
      200: {
        description: "Incidents",
        content: { "application/json": { schema: z.object({ data: z.array(incidentDTO) }) } },
      },
      400: errors[400],
    },
  }),
  async (context) => {
    const incidents = await listIncidentsUseCase(context.req.valid("query"), context.get("db"));
    return context.json({ data: incidents.map(serializeIncident) }, 200);
  },
);

incidentsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postIncidents",
    tags: ["Incidents"],
    summary: "Report an incident for a receipt or receipt item",
    request: {
      body: { required: true, content: { "application/json": { schema: createIncidentDTO } } },
    },
    responses: {
      201: {
        description: "Incident created",
        content: { "application/json": { schema: z.object({ data: incidentDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (context) => {
    const incident = await createIncidentUseCase(
      context.get("userId"),
      context.req.valid("json"),
      context.get("db"),
    );
    return context.json({ data: serializeIncident(incident) }, 201);
  },
);

incidentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{incidentId}",
    operationId: "getIncidentsIncidentId",
    tags: ["Incidents"],
    summary: "Get incident detail",
    request: { params: incidentIdParamsDTO },
    responses: {
      200: {
        description: "Incident",
        content: { "application/json": { schema: z.object({ data: incidentDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (context) => {
    const incident = await getIncidentUseCase(
      context.req.valid("param").incidentId,
      context.get("db"),
    );
    return context.json({ data: serializeIncident(incident) }, 200);
  },
);

incidentsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{incidentId}",
    operationId: "patchIncidentsIncidentId",
    tags: ["Incidents"],
    summary: "Update incident status, assignment or resolution",
    request: {
      params: incidentIdParamsDTO,
      body: { required: true, content: { "application/json": { schema: updateIncidentDTO } } },
    },
    responses: {
      200: {
        description: "Incident updated",
        content: { "application/json": { schema: z.object({ data: incidentDTO }) } },
      },
      ...errors,
    },
  }),
  async (context) => {
    const incident = await updateIncidentUseCase(
      context.req.valid("param").incidentId,
      context.get("userId"),
      context.req.valid("json"),
      context.get("db"),
    );
    return context.json({ data: serializeIncident(incident) }, 200);
  },
);

function serializeIncident(incident: Awaited<ReturnType<typeof getIncidentUseCase>>) {
  return {
    ...incident,
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  };
}
