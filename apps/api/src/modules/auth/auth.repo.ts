import { and, eq, gt, isNull } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import { users } from "../users/users.schema.js";
import { authSessions } from "./auth.schema.js";

export class AuthRepo {
  constructor(private readonly conn: Executor) {}

  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }) {
    return this.conn
      .insert(authSessions)
      .values({
        userId: input.userId,
        sessionTokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      })
      .returning({ id: authSessions.id });
  }

  async getSession(tokenHash: string, now = new Date()) {
    const [session] = await this.conn
      .select({
        sessionId: authSessions.id,
        userId: users.id,
        userName: users.userName,
        role: users.role,
        branchId: users.branchId,
        active: users.active,
        expiresAt: authSessions.expiresAt,
        lastUsedAt: authSessions.lastUsedAt,
      })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(
        and(
          eq(authSessions.sessionTokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
          eq(users.active, true),
        ),
      );
    return session;
  }

  touchSession(sessionId: string, now = new Date(), renewedExpiresAt?: Date) {
    return this.conn
      .update(authSessions)
      .set(
        renewedExpiresAt ? { lastUsedAt: now, expiresAt: renewedExpiresAt } : { lastUsedAt: now },
      )
      .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
  }

  revokeSession(tokenHash: string, now = new Date()) {
    return this.conn
      .update(authSessions)
      .set({ revokedAt: now })
      .where(and(eq(authSessions.sessionTokenHash, tokenHash), isNull(authSessions.revokedAt)));
  }

  async getUserWithBranch(userId: string) {
    const [user] = await this.conn
      .select({
        id: users.id,
        userName: users.userName,
        role: users.role,
        branch: { id: branches.id, name: branches.name },
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(and(eq(users.id, userId), eq(users.active, true)));
    return user;
  }
}
