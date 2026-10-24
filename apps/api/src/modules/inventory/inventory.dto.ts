import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";

import {
  inventoryClosureItems,
  inventoryClosures,
  inventoryReceipts,
  inventoryShifts,
} from "./inventory.schema.js";

export const shiftNameValues = ["morning", "afternoon", "night"] as const;
export const shiftStatusValues = ["open", "closed"] as const;
export const inventoryIncidentValues = ["none", "shortage", "surplus", "damaged"] as const;

export const createInventoryShiftDTO = z
  .object({
    branchId: z.uuid(),
    businessDate: z.iso.date(),
    shiftName: z.enum(shiftNameValues),
    notes: z.string().trim().min(1).max(1000).optional(),
  })
  .openapi("CreateInventoryShift");

export const inventoryShiftIdParamsDTO = z.object({
  shiftId: z.uuid().openapi({ param: { name: "shiftId", in: "path" } }),
});

export const listInventoryShiftsQueryDTO = z.object({
  branchId: z.uuid().optional(),
  businessDate: z.iso.date().optional(),
  shiftName: z.enum(shiftNameValues).optional(),
});

export const inventoryClosureIdParamsDTO = z.object({
  closureId: z.uuid().openapi({ param: { name: "closureId", in: "path" } }),
});

export const listInventoryClosuresQueryDTO = z.object({
  branchId: z.uuid().optional(),
  businessDate: z.iso.date().optional(),
});

export const recordInventoryReceiptDTO = z
  .object({
    supplyId: z.uuid(),
    expectedQuantity: z.number().int().nonnegative().optional(),
    receivedQuantity: z.number().int().nonnegative(),
    incidentType: z.enum(inventoryIncidentValues).default("none"),
    notes: z.string().trim().min(1).max(1000).optional(),
  })
  .openapi("RecordInventoryReceipt");

export const inventoryShiftDto = createSelectSchema(inventoryShifts).openapi("InventoryShift");
export const inventoryReceiptDto = createSelectSchema(inventoryReceipts).openapi(
  "InventoryReceipt",
);
export const inventoryClosureDto = createSelectSchema(inventoryClosures).openapi(
  "InventoryClosure",
);
export const inventoryClosureItemDto = createSelectSchema(inventoryClosureItems).openapi(
  "InventoryClosureItem",
);
export const inventoryClosureDetailDto = inventoryClosureDto
  .extend({
    items: z.array(inventoryClosureItemDto),
  })
  .openapi("InventoryClosureDetail");

export const closeInventoryShiftItemDTO = z.object({
  supplyId: z.uuid(),
  closingQuantity: z.number().int().nonnegative(),
});

export const closeInventoryShiftDTO = z
  .object({
    closingItems: z.array(closeInventoryShiftItemDTO).min(1),
    notes: z.string().trim().min(1).max(1000).optional(),
  })
  .openapi("CloseInventoryShift");

export const closeShiftResultDto = z
  .object({
    closure: inventoryClosureDto,
    replenishmentRequest: z
      .object({
        id: z.uuid(),
        requestNumber: z.string(),
        status: z.enum([
          "draft",
          "submitted",
          "approved",
          "rejected",
          "partially_fulfilled",
          "fulfilled",
          "cancelled",
        ]),
        branchId: z.uuid(),
        inventoryClosureId: z.uuid(),
        requestedBy: z.uuid(),
        notes: z.string().nullable(),
        items: z.array(
          z.object({
            supplyId: z.uuid(),
            suggestedQuantity: z.number().int(),
            requestedQuantity: z.number().int(),
          }),
        ),
      })
      .nullable(),
  })
  .openapi("CloseShiftResult");

export const inventoryClosureReportSupplyDto = z
  .object({
    id: z.uuid(),
    sku: z.string(),
    name: z.string(),
  })
  .openapi("InventoryClosureReportSupply");

export const inventoryClosureReportItemDto = z
  .object({
    closureItem: inventoryClosureItemDto,
    supply: inventoryClosureReportSupplyDto,
    targetQuantity: z.number().int().nonnegative().nullable(),
    receivedQuantityInShift: z.number().int().nonnegative(),
    requestedQuantity: z.number().int().nonnegative().nullable(),
  })
  .openapi("InventoryClosureReportItem");

export const inventoryClosureReportDto = z
  .object({
    closure: inventoryClosureDto,
    shift: inventoryShiftDto,
    items: z.array(inventoryClosureReportItemDto),
    replenishmentRequest: z
      .object({
        id: z.uuid(),
        requestNumber: z.string(),
        status: z.enum([
          "draft",
          "submitted",
          "approved",
          "rejected",
          "partially_fulfilled",
          "fulfilled",
          "cancelled",
        ]),
        items: z.array(
          z.object({
            supplyId: z.uuid(),
            requestedQuantity: z.number().int().nonnegative(),
          }),
        ),
      })
      .nullable(),
  })
  .openapi("InventoryClosureReport");

export type CreateInventoryShiftInput = z.infer<typeof createInventoryShiftDTO>;
export type RecordInventoryReceiptInput = z.infer<typeof recordInventoryReceiptDTO>;
