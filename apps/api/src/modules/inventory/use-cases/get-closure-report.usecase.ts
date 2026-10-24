import { eq } from "drizzle-orm";

import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "@/modules/replenishments/replenishments.repo.js";
import { inventoryClosureItems, inventoryShifts } from "../inventory.schema.js";
import { supplies } from "@/modules/supplies/supplies.schema.js";
import { InventoryRepo } from "../inventory.repo.js";

export async function getClosureReportUseCase(closureId: string, db: Executor = DB) {
  const inventoryRepo = new InventoryRepo(db);
  const replenRepo = new ReplenishmentsRepo(db);

  const closure = await inventoryRepo.getClosure(closureId);
  if (!closure) {
    throw new AppError(404, "INVENTORY_CLOSURE_NOT_FOUND", "Inventory closure not found");
  }

  const [shift] = await db
    .select()
    .from(inventoryShifts)
    .where(eq(inventoryShifts.id, closure.inventoryShiftId));
  if (!shift) {
    throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
  }

  const receivedByShift = await inventoryRepo.sumReceiptsByShift(shift.id);

  const itemsRaw = await db
    .select({
      closureItem: inventoryClosureItems,
      supply: { id: supplies.id, sku: supplies.sku, name: supplies.name },
    })
    .from(inventoryClosureItems)
    .innerJoin(supplies, eq(inventoryClosureItems.supplyId, supplies.id))
    .where(eq(inventoryClosureItems.inventoryClosureId, closureId));

  const supplyIds = itemsRaw.map((it) => it.supply.id);
  const allSettings = supplyIds.length
    ? await inventoryRepo.getActiveBranchSupplySettings(closure.branchId)
    : [];
  const settingsBySupply = new Map(
    allSettings.filter((s) => supplyIds.includes(s.supplyId)).map((s) => [s.supplyId, s]),
  );

  const replenishment = await replenRepo.getReplenishmentByClosureId(closureId);
  const requestedBySupply = new Map<string, number>();
  if (replenishment) {
    const replenItems = await replenRepo.listItemsByReplenishmentId(replenishment.id);
    for (const item of replenItems) {
      requestedBySupply.set(item.supplyId, Number(item.requestedQuantity));
    }
  }

  return {
    closure: serializeClosure(closure),
    shift: serializeShift(shift),
    items: itemsRaw.map((it) => ({
      closureItem: serializeItem(it.closureItem),
      supply: it.supply,
      targetQuantity: settingsBySupply.get(it.supply.id)
        ? Number(settingsBySupply.get(it.supply.id)!.targetQuantity)
        : null,
      receivedQuantityInShift: receivedByShift.get(it.supply.id) ?? 0,
      requestedQuantity: requestedBySupply.get(it.supply.id) ?? null,
    })),
    replenishmentRequest: replenishment
      ? {
          id: replenishment.id,
          requestNumber: replenishment.requestNumber,
          status: replenishment.status,
          items: Array.from(requestedBySupply.entries()).map(
            ([supplyId, requestedQuantity]) => ({
              supplyId,
              requestedQuantity,
            }),
          ),
        }
      : null,
  };
}

function serializeClosure(closure: {
  id: string;
  inventoryShiftId: string;
  branchId: string;
  closedBy: string;
  closedAt: Date;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: closure.id,
    inventoryShiftId: closure.inventoryShiftId,
    branchId: closure.branchId,
    closedBy: closure.closedBy,
    closedAt: closure.closedAt.toISOString(),
    notes: closure.notes,
    createdAt: closure.createdAt.toISOString(),
  };
}

function serializeShift(shift: {
  id: string;
  branchId: string;
  businessDate: string;
  shiftName: string;
  status: string;
  openedBy: string;
  closedBy: string | null;
  openedAt: Date;
  closedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: shift.id,
    branchId: shift.branchId,
    businessDate: shift.businessDate,
    shiftName: shift.shiftName as "morning" | "afternoon" | "night",
    status: shift.status as "open" | "closed",
    openedBy: shift.openedBy,
    closedBy: shift.closedBy,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt ? shift.closedAt.toISOString() : null,
    notes: shift.notes,
    createdAt: shift.createdAt.toISOString(),
  };
}

function serializeItem(item: {
  id: string;
  inventoryClosureId: string;
  supplyId: string;
  openingQuantity: number;
  closingQuantity: number;
  createdAt: Date;
}) {
  return {
    id: item.id,
    inventoryClosureId: item.inventoryClosureId,
    supplyId: item.supplyId,
    openingQuantity: item.openingQuantity,
    closingQuantity: item.closingQuantity,
    createdAt: item.createdAt.toISOString(),
  };
}
