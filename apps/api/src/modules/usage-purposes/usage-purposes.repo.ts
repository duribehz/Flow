import { asc, eq } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import type {
  CreateUsagePurposeInput,
  EditUsagePurposeInput,
  ListUsagePurposesQuery,
} from "./usage-purposes.dto.js";
import { usagePurposes } from "./usage-purposes.schema.js";

export class UsagePurposesRepo {
  constructor(private readonly conn: Executor) {}

  getUsagePurposes(filters: ListUsagePurposesQuery) {
    return this.conn
      .select()
      .from(usagePurposes)
      .where(filters.active === undefined ? undefined : eq(usagePurposes.active, filters.active))
      .orderBy(asc(usagePurposes.name));
  }

  async getUsagePurposeById(usagePurposeId: string) {
    const [usagePurpose] = await this.conn
      .select()
      .from(usagePurposes)
      .where(eq(usagePurposes.id, usagePurposeId));

    return usagePurpose;
  }

  async createUsagePurpose(input: CreateUsagePurposeInput) {
    const [usagePurpose] = await this.conn
      .insert(usagePurposes)
      .values(input)
      .onConflictDoNothing()
      .returning();

    return usagePurpose;
  }

  async editUsagePurpose(usagePurposeId: string, input: EditUsagePurposeInput) {
    const [usagePurpose] = await this.conn
      .update(usagePurposes)
      .set(input)
      .where(eq(usagePurposes.id, usagePurposeId))
      .returning();

    return usagePurpose;
  }
}

export type UsagePurpose = Awaited<ReturnType<UsagePurposesRepo["getUsagePurposes"]>>[number];
