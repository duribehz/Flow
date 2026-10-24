import { z } from "@hono/zod-openapi";

export const incidentTypeValues = [
  "missing",
  "damaged",
  "excess",
  "expired",
  "incorrect",
  "other",
] as const;
export const incidentStatusValues = ["open", "investigating", "resolved", "closed"] as const;

export const incidentIdParamsDTO = z.object({
  incidentId: z.uuid().openapi({ param: { name: "incidentId", in: "path" } }),
});

export const createIncidentDTO = z
  .object({
    receiptId: z.uuid(),
    receiptItemId: z.uuid().nullable().optional(),
    type: z.enum(incidentTypeValues),
    description: z.string().trim().min(1).max(4000),
  })
  .openapi("CreateIncident");

export const updateIncidentDTO = z
  .object({
    status: z.enum(incidentStatusValues).optional(),
    assignedTo: z.uuid().nullable().optional(),
    resolution: z.string().trim().min(1).max(4000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.assignedTo !== undefined ||
      value.resolution !== undefined,
    { message: "At least one field is required" },
  )
  .openapi("UpdateIncident");

export const incidentListQueryDTO = z.object({
  receiptId: z.uuid().optional(),
  status: z.enum(incidentStatusValues).optional(),
});

export const incidentDTO = z
  .object({
    id: z.uuid(),
    incidentNumber: z.string(),
    receiptId: z.uuid(),
    receiptItemId: z.uuid().nullable(),
    type: z.enum(incidentTypeValues),
    status: z.enum(incidentStatusValues),
    description: z.string(),
    reportedBy: z.object({ id: z.uuid(), userName: z.string() }),
    assignedTo: z.object({ id: z.uuid(), userName: z.string() }).nullable(),
    resolution: z.string().nullable(),
    resolvedBy: z.object({ id: z.uuid(), userName: z.string() }).nullable(),
    resolvedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("Incident");

export type CreateIncidentInput = z.infer<typeof createIncidentDTO>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentDTO>;
