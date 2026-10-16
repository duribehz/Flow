import { z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/presentation/http/contracts.js";

export const replenishmentStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
]);

const branchSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const userSchema = z.object({
  id: z.uuid(),
  userName: z.string(),
});

const dateTimeSchema = z.iso.datetime();

export const submittedReplenishmentSchema = z
  .object({
    id: z.uuid(),
    requestNumber: z.string(),
    branch: branchSchema,
    status: z.literal("submitted"),
    requestedBy: userSchema,
    submittedAt: dateTimeSchema.nullable(),
    createdAt: dateTimeSchema,
  })
  .openapi("SubmittedReplenishment");

const replenishmentItemSchema = z
  .object({
    id: z.uuid(),
    supply: z.object({
      id: z.uuid(),
      sku: z.string(),
      name: z.string(),
    }),
    category: z.object({
      id: z.uuid(),
      name: z.string(),
    }),
    unit: z.object({
      id: z.uuid(),
      name: z.string(),
      symbol: z.string(),
    }),
    suggestedQuantity: z.number().int().nonnegative(),
    requestedQuantity: z.number().int().positive(),
    approvedQuantity: z.number().int().nonnegative().nullable(),
    fulfilledQuantity: z.number().int().nonnegative(),
    notes: z.string().nullable(),
    createdAt: dateTimeSchema,
  })
  .openapi("ReplenishmentItem");

export const replenishmentDetailSchema = z
  .object({
    id: z.uuid(),
    requestNumber: z.string(),
    inventoryClosureId: z.uuid(),
    status: replenishmentStatusSchema,
    branch: branchSchema,
    requestedBy: userSchema,
    reviewedBy: userSchema.nullable(),
    submittedAt: dateTimeSchema.nullable(),
    reviewedAt: dateTimeSchema.nullable(),
    notes: z.string().nullable(),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    items: z.array(replenishmentItemSchema),
  })
  .openapi("ReplenishmentDetail");

export const replenishmentIdParamsSchema = z.object({
  replenishmentId: z.uuid().openapi({ param: { name: "replenishmentId", in: "path" } }),
});

export const replenishmentErrorSchema = errorSchema;
