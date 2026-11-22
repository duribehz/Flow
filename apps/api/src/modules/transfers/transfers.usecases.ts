import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type {
  AcceptTransferInput,
  CreateTransferInput,
  ListTransfersFilters,
} from "./transfers.dto.js";
import { TransfersRepo } from "./transfers.repo.js";

export function createTransferUseCase(
  senderId: string,
  input: CreateTransferInput,
  db: Executor = DB,
  branchScopeId?: string,
) {
  return new TransfersRepo(db).create(senderId, input, branchScopeId);
}

export function listTransferBranchOptionsUseCase(db: Executor = DB) {
  return new TransfersRepo(db).listBranchOptions();
}

export function listTransfersUseCase(
  filters: ListTransfersFilters,
  db: Executor = DB,
  branchScopeId?: string,
) {
  return new TransfersRepo(db).list(filters, branchScopeId);
}

export function getTransferUseCase(transferId: string, db: Executor = DB) {
  return new TransfersRepo(db).getById(transferId);
}

export function cancelTransferUseCase(
  transferId: string,
  actorId: string,
  db: Executor = DB,
  branchScopeId?: string,
) {
  return new TransfersRepo(db).cancel(transferId, actorId, branchScopeId);
}

export function acceptTransferUseCase(
  transferId: string,
  receiverId: string,
  input: AcceptTransferInput,
  db: Executor = DB,
  branchScopeId?: string,
) {
  return new TransfersRepo(db).accept(transferId, receiverId, input, branchScopeId);
}
