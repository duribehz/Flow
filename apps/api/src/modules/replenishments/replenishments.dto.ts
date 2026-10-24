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
