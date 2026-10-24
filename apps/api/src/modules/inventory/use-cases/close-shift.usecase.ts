import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReplenishmentsRepo } from "@/modules/replenishments/replenishments.repo.js";
import { InventoryRepo } from "../inventory.repo.js";

export type CloseShiftItemInput = {
  supplyId: string;
  closingQuantity: number;
};

export type CloseShiftInput = {
  closingItems: CloseShiftItemInput[];
  notes?: string | null;
};

export async function closeShiftUseCase(
  actorId: string,
  shiftId: string,
  input: CloseShiftInput,
  db: Executor = DB,
) {
  const inventoryRepo = new InventoryRepo(db);

  const shift = await inventoryRepo.getShift(shiftId);
  if (!shift) {
    throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
  }
  if (shift.status === "closed") {
    throw new AppError(409, "SHIFT_CLOSED", "The shift is already closed");
  }

  const supplyIds = input.closingItems.map((item) => item.supplyId);
  const uniqueSupplyIds = Array.from(new Set(supplyIds));
  if (uniqueSupplyIds.length !== supplyIds.length) {
    throw new AppError(
      400,
      "DUPLICATE_SUPPLY_ITEMS",
      "Each supply must appear at most once in closingItems",
    );
  }

  const receipts = await inventoryRepo.listReceiptsByShift(shiftId);
  const receivedInShift = new Map<string, number>();
  for (const receipt of receipts) {
    receivedInShift.set(
      receipt.supplyId,
      (receivedInShift.get(receipt.supplyId) ?? 0) + Number(receipt.receivedQuantity),
    );
  }

  const previousClosings =
    supplyIds.length === 0
      ? new Map<string, number>()
      : await inventoryRepo.getLastClosingQuantityBySupply(shift.branchId, supplyIds);

  const openingFor = (supplyId: string): number => {
    const fromReceipts = receivedInShift.get(supplyId) ?? 0;
    const fromPrevious = previousClosings.get(supplyId) ?? 0;
    return fromPrevious + fromReceipts;
  };

  const runWith = async (invRepo: InventoryRepo, repRepo: ReplenishmentsRepo) => {
    const branchIdPrefix = shift.branchId.slice(0, 8);

    const settings = await invRepo.getActiveBranchSupplySettings(shift.branchId);
    const settingsBySupply = new Map(settings.map((s) => [s.supplyId, s]));

    const closingItemsToInsert = input.closingItems.map((item) => ({
      supplyId: item.supplyId,
      openingQuantity: openingFor(item.supplyId),
      closingQuantity: item.closingQuantity,
    }));

    const itemsToRequest: Array<{
      supplyId: string;
      suggestedQuantity: number;
      requestedQuantity: number;
    }> = [];

    for (const item of closingItemsToInsert) {
      const setting = settingsBySupply.get(item.supplyId);
      if (!setting) continue;
      const target = Number(setting.targetQuantity);
      const requested = Math.max(target - item.closingQuantity, 0);
      if (requested <= 0) continue;
      itemsToRequest.push({
        supplyId: item.supplyId,
        suggestedQuantity: requested,
        requestedQuantity: requested,
      });
    }

    const closedAt = new Date();

    const closure = await invRepo.insertClosure({
      inventoryShiftId: shiftId,
      branchId: shift.branchId,
      closedBy: actorId,
      closedAt,
      notes: input.notes ?? null,
    });

    await invRepo.insertClosureItems(closure.id, closingItemsToInsert);
    await invRepo.markShiftClosed(shiftId, actorId, closedAt);

    if (itemsToRequest.length === 0) {
      return { closure: serialize(closure), replenishmentRequest: null };
    }

    const seq = await repRepo.nextRequestCounter(branchIdPrefix);
    const requestNumber = `RR-${branchIdPrefix}-${String(seq).padStart(4, "0")}`;

    const created = await repRepo.createRequestWithItems(
      {
        requestNumber,
        branchId: shift.branchId,
        inventoryClosureId: closure.id,
        requestedBy: actorId,
      },
      itemsToRequest,
    );

    return {
      closure: serialize(closure),
      replenishmentRequest: {
        id: created.id,
        requestNumber: created.requestNumber,
        status: created.status,
        branchId: created.branchId,
        inventoryClosureId: created.inventoryClosureId,
        requestedBy: created.requestedBy,
        notes: created.notes,
        items: itemsToRequest,
      },
    };
  };

  if ("transaction" in db) {
    return db.transaction(async (tx) => {
      const txInv = new InventoryRepo(tx as Executor);
      const txRep = new ReplenishmentsRepo(tx as Executor);
      return runWith(txInv, txRep);
    });
  }

  const repRepo = new ReplenishmentsRepo(db);
  return runWith(inventoryRepo, repRepo);
}

function serialize(closure: {
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
