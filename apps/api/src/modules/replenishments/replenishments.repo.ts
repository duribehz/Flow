import type { Executor } from "@/shared/infrastructure/database/client";
import { replenishmentRequests } from "./replenishments.schema";
import { branches } from "../branches/branches.schema";
import { eq } from "drizzle-orm";
import { users } from "../users/users.schema";

export class ReplenishmentsRepo {
  constructor(private readonly conn: Executor) {}

  async getAllReplenishments() {
    const replenishments = await this.conn
      .select({
        id: replenishmentRequests.id,
        branch: {
          id: branches.id,
          name: branches.name,
        },
        status: replenishmentRequests.status,
        requestedBy: {
          id: users.id,
          userName: users.userName,
        },
      })
      .from(replenishmentRequests)
      .innerJoin(users, eq(replenishmentRequests.requestedBy, users.id))
      .where(eq(replenishmentRequests.status, "submitted"));

    return replenishments;
  }

  async getReplenishmentById(replenishmentId: string) {
    const [replenishment] = await this.conn
      .select()
      .from(replenishmentRequests)
      .where(eq(replenishmentRequests.id, replenishmentId));

    return replenishment;
  }
}
