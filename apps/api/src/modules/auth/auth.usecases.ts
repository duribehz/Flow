import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { UsersRepo } from "../users/users.repo.js";
import type { LoginInput } from "./auth.dto.js";
import { AuthRepo } from "./auth.repo.js";

const sessionLifetimeMs = 12 * 60 * 60 * 1000;

export async function loginUseCase(
  input: LoginInput,
  metadata: { ipAddress: string | null; userAgent: string | null },
  db: Executor = DB,
) {
  const usersRepo = new UsersRepo(db);
  const user = await usersRepo.findByUserName(input.userName);
  if (
    !user ||
    !user.active ||
    !(await verifyAndUpgradePassword(user.id, user.passwordHash, input.password, usersRepo))
  ) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid user name or password");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const authRepo = new AuthRepo(db);
  await authRepo.createSession({
    userId: user.id,
    tokenHash,
    expiresAt,
    ...metadata,
  });

  const currentUser = await authRepo.getUserWithBranch(user.id);
  if (!currentUser) throw new AppError(401, "INVALID_CREDENTIALS", "User is not active");
  return { token: rawToken, expiresAt, user: currentUser };
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function verifyAndUpgradePassword(
  userId: string,
  passwordHash: string,
  password: string,
  usersRepo: UsersRepo,
) {
  if (passwordHash.startsWith("$argon2id$")) {
    return Bun.password.verify(password, passwordHash);
  }

  const stored = Buffer.from(passwordHash);
  const submitted = Buffer.from(password);
  const matches = stored.length === submitted.length && timingSafeEqual(stored, submitted);
  if (matches) {
    const upgradedHash = await Bun.password.hash(password, { algorithm: "argon2id" });
    await usersRepo.updatePasswordHash(userId, upgradedHash);
  }
  return matches;
}

export function getCurrentUserUseCase(userId: string, db: Executor = DB) {
  return new AuthRepo(db).getUserWithBranch(userId);
}

export function logoutUseCase(tokenHash: string, db: Executor = DB) {
  return new AuthRepo(db).revokeSession(tokenHash);
}
