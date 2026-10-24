import { z } from "@hono/zod-openapi";

const userDto = z.object({
  id: z.uuid(),
  userName: z.string(),
});

const replenishmentItemDto = z
  .object({
    id: z.uuid(),
    supply: z.object({
      id: z.uuid(),
      sku: z.string(),
      name: z.string(),
    }),
    usagePurposeId: z.uuid(),
    usagePurposeName: z.string(),
    category: z.object({
      id: z.uuid(),
      name: z.string(),
    }),
    unit: z.object({
      id: z.uuid(),
      name: z.string(),
      symbol: z.string(),
    }),
    existenceQuantity: z.number().int().safe().nonnegative().nullable(),
    suggestedQuantity: z.number().int().safe().nonnegative().nullable(),
    requestedQuantity: z.number().int().safe().nonnegative(),
    approvedQuantity: z.number().int().nonnegative().nullable(),
    fulfilledQuantity: z.number().int().nonnegative(),
    unitCost: z.number().int().safe().nonnegative(),
    lineTotal: z.number().int().safe().nonnegative(),
    createdAt: z.iso.datetime(),
  })
  .openapi("ReplenishmentItem");

export const replenishmentDto = z
  .object({
    id: z.uuid(),
    requestNumber: z.string(),
    inventoryCountId: z.uuid(),
    status: z.enum([
      "draft",
      "submitted",
      "approved",
      "rejected",
      "partially_fulfilled",
      "fulfilled",
      "cancelled",
    ]),
    branch: z.object({
      id: z.uuid(),
      name: z.string(),
    }),
    requestedBy: userDto,
    reviewedBy: userDto.nullable(),
    submittedAt: z.iso.datetime().nullable(),
    reviewedAt: z.iso.datetime().nullable(),
    notes: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(replenishmentItemDto),
  })
  .openapi("ReplenishmentDetail");

export const replenishmentIdParamsDto = z.object({
  replenishmentId: z.uuid().openapi({ param: { name: "replenishmentId", in: "path" } }),
});

export const replenishmentItemParamsDto = replenishmentIdParamsDto.extend({
  itemId: z.uuid().openapi({ param: { name: "itemId", in: "path" } }),
});

export const updateReplenishmentNotesDto = z
  .object({ notes: z.string().trim().min(1).max(2000).nullable() })
  .openapi("UpdateReplenishmentNotes");

export const addReplenishmentItemDto = z
  .object({
    supplyId: z.uuid(),
    usagePurposeId: z.uuid(),
    requestedQuantity: z.number().int().safe().nonnegative(),
  })
  .openapi("AddReplenishmentItem");

export const updateReplenishmentItemDto = z
  .object({
    usagePurposeId: z.uuid().optional(),
    requestedQuantity: z.number().int().safe().nonnegative().optional(),
  })
  .refine((value) => value.usagePurposeId !== undefined || value.requestedQuantity !== undefined, {
    message: "At least one field is required",
  })
  .openapi("UpdateReplenishmentItem");

export const submittedReplenishmentDto = z
  .object({
    id: z.uuid(),
    requestNumber: z.string(),
    branch: z.object({
      id: z.uuid(),
      name: z.string(),
    }),
    status: z.literal("submitted"),
    requestedBy: z.object({
      id: z.uuid(),
      userName: z.string(),
    }),
    submittedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi("SubmittedReplenishment");

export const draftReplenishmentDto = z
  .object({
    id: z.uuid(),
    requestNumber: z.string(),
    inventoryCountId: z.uuid(),
    branch: z.object({ id: z.uuid(), name: z.string() }),
    status: z.literal("draft"),
    requestedBy: userDto,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("DraftReplenishment");
