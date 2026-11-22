import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateUserInput, UpdateUserInput, UserRole } from "./users.dto.js";
import { UsersRepo } from "./users.repo.js";

export async function createUserUseCase(input: CreateUserInput, db: Executor = DB) {
  const usersRepo = new UsersRepo(db);
  if (input.role === "manager" && input.branchId) {
    if (!(await usersRepo.branchExists(input.branchId))) {
      throw new AppError(404, "BRANCH_NOT_FOUND", "Branch not found");
    }
  }

  const passwordHash = await Bun.password.hash(input.password, { algorithm: "argon2id" });
  const user = await usersRepo.createUser(input, passwordHash);
  if (!user) throw new AppError(409, "USER_NAME_CONFLICT", "User name already exists");
  return user;
}

export function listUsersUseCase(db: Executor = DB) {
  return new UsersRepo(db).listUsers();
}

export async function updateUserUseCase(
  actorId: string,
  targetId: string,
  input: UpdateUserInput,
  db: Executor = DB,
) {
  const usersRepo = new UsersRepo(db);
  const target = await usersRepo.findById(targetId);
  if (!target) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  if (target.role === "super_admin") {
    throw new AppError(403, "SUPER_ADMIN_PROTECTED", "The super admin cannot be modified here");
  }

  const nextRole = input.role ?? (target.role as UserRole);
  const nextBranchId =
    nextRole === "manager"
      ? input.branchId !== undefined
        ? input.branchId
        : target.branchId
      : null;
  if (nextRole === "manager" && !nextBranchId) {
    throw new AppError(400, "MANAGER_BRANCH_REQUIRED", "Managers must be assigned to a branch");
  }
  if (nextBranchId && !(await usersRepo.branchExists(nextBranchId))) {
    throw new AppError(404, "BRANCH_NOT_FOUND", "Branch not found");
  }

  const fields: Parameters<UsersRepo["updateUser"]>[1] = {
    role: nextRole,
    branchId: nextBranchId,
  };
  if (input.userName !== undefined) fields.userName = input.userName;
  if (input.active !== undefined) fields.active = input.active;
  if (input.password !== undefined) {
    fields.passwordHash = await Bun.password.hash(input.password, { algorithm: "argon2id" });
  }

  try {
    const user = await usersRepo.updateUser(targetId, fields);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return { user, actorId };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new AppError(409, "USER_NAME_CONFLICT", "User name already exists");
    }
    throw error;
  }
}

export async function deactivateUserUseCase(actorId: string, targetId: string, db: Executor = DB) {
  if (actorId === targetId) {
    throw new AppError(400, "CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own user");
  }
  const usersRepo = new UsersRepo(db);
  const target = await usersRepo.findById(targetId);
  if (!target) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  if (target.role === "super_admin") {
    throw new AppError(403, "SUPER_ADMIN_PROTECTED", "The super admin cannot be deactivated");
  }
  const user = await usersRepo.updateUser(targetId, { active: false });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  return user;
}
