export type ReplenishmentStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled";

export interface ReplenishmentBranchReadModel {
  id: string;
  name: string;
}

export interface ReplenishmentUserReadModel {
  id: string;
  userName: string;
}

export interface SubmittedReplenishmentReadModel {
  id: string;
  requestNumber: string;
  branch: ReplenishmentBranchReadModel;
  status: "submitted";
  requestedBy: ReplenishmentUserReadModel;
  submittedAt: Date | null;
  createdAt: Date;
}

export interface ReplenishmentItemReadModel {
  id: string;
  supply: {
    id: string;
    sku: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    name: string;
    symbol: string;
  };
  suggestedQuantity: number;
  requestedQuantity: number;
  approvedQuantity: number | null;
  fulfilledQuantity: number;
  notes: string | null;
  createdAt: Date;
}

export interface ReplenishmentDetailReadModel {
  id: string;
  requestNumber: string;
  inventoryClosureId: string;
  status: ReplenishmentStatus;
  branch: ReplenishmentBranchReadModel;
  requestedBy: ReplenishmentUserReadModel;
  reviewedBy: ReplenishmentUserReadModel | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: ReplenishmentItemReadModel[];
}
