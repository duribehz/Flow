import { and, asc, eq, inArray } from "drizzle-orm";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import {
  branchSupplySettings,
  branchSupplyWeeklyTargets,
  supplies,
} from "../supplies/supplies.schema.js";
import { usagePurposes } from "../usage-purposes/usage-purposes.schema.js";
import type { UpsertBranchSupplySettingInput } from "./branch-supply-settings.dto.js";

export class BranchSupplySettingsRepo {
  constructor(private readonly conn: Executor) {}

  async list(branchId: string, conn: Executor = this.conn) {
    const settings = await conn
      .select()
      .from(branchSupplySettings)
      .where(eq(branchSupplySettings.branchId, branchId))
      .orderBy(asc(branchSupplySettings.supplyId));

    return this.addWeeklyTargets(settings, conn);
  }

  async get(branchId: string, supplyId: string, conn: Executor = this.conn) {
    const [setting] = await conn
      .select()
      .from(branchSupplySettings)
      .where(
        and(
          eq(branchSupplySettings.branchId, branchId),
          eq(branchSupplySettings.supplyId, supplyId),
        ),
      );

    if (!setting) return undefined;

    const [result] = await this.addWeeklyTargets([setting], conn);
    return result;
  }

  upsert(branchId: string, supplyId: string, input: UpsertBranchSupplySettingInput) {
    return this.runInTransaction(async (conn) => {
      const [branch] = await conn
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.id, branchId));
      if (!branch) throw new AppError(404, "BRANCH_NOT_FOUND", "Branch not found");

      const [supply] = await conn
        .select({ id: supplies.id })
        .from(supplies)
        .where(eq(supplies.id, supplyId));
      if (!supply) throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");

      const current = await this.get(branchId, supplyId, conn);
      const [purpose] = await conn
        .select({ id: usagePurposes.id, active: usagePurposes.active })
        .from(usagePurposes)
        .where(eq(usagePurposes.id, input.defaultUsagePurposeId));
      if (!purpose) {
        throw new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Usage purpose not found");
      }

      const mayKeepInactivePurpose =
        current !== undefined &&
        current.defaultUsagePurposeId === input.defaultUsagePurposeId &&
        input.active === false;
      if (!purpose.active && !mayKeepInactivePurpose) {
        throw new AppError(409, "USAGE_PURPOSE_INACTIVE", "Usage purpose is inactive");
      }

      const [setting] = await conn
        .insert(branchSupplySettings)
        .values({
          branchId,
          supplyId,
          mode: input.mode,
          defaultUsagePurposeId: input.defaultUsagePurposeId,
          active: input.active,
        })
        .onConflictDoUpdate({
          target: [branchSupplySettings.branchId, branchSupplySettings.supplyId],
          set: {
            mode: input.mode,
            defaultUsagePurposeId: input.defaultUsagePurposeId,
            active: input.active,
            updatedAt: new Date(),
          },
        })
        .returning({ id: branchSupplySettings.id });

      await conn
        .delete(branchSupplyWeeklyTargets)
        .where(eq(branchSupplyWeeklyTargets.branchSupplySettingId, setting!.id));

      if (input.weeklyTargets.length > 0) {
        await conn.insert(branchSupplyWeeklyTargets).values(
          input.weeklyTargets.map((target) => ({
            branchSupplySettingId: setting!.id,
            weekday: target.weekday,
            targetQuantity: target.targetQuantity,
          })),
        );
      }

      return (await this.get(branchId, supplyId, conn))!;
    });
  }

  private async addWeeklyTargets<T extends { id: string }>(settings: T[], conn: Executor) {
    if (settings.length === 0) {
      return settings.map((setting) => ({ ...setting, weeklyTargets: [] }));
    }

    const targets = await conn
      .select({
        branchSupplySettingId: branchSupplyWeeklyTargets.branchSupplySettingId,
        weekday: branchSupplyWeeklyTargets.weekday,
        targetQuantity: branchSupplyWeeklyTargets.targetQuantity,
      })
      .from(branchSupplyWeeklyTargets)
      .where(
        inArray(
          branchSupplyWeeklyTargets.branchSupplySettingId,
          settings.map((setting) => setting.id),
        ),
      )
      .orderBy(asc(branchSupplyWeeklyTargets.weekday));
    const targetsBySetting = Map.groupBy(targets, (target) => target.branchSupplySettingId);

    return settings.map((setting) => ({
      ...setting,
      weeklyTargets: (targetsBySetting.get(setting.id) ?? []).map(
        ({ weekday, targetQuantity }) => ({ weekday, targetQuantity }),
      ),
    }));
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) return this.conn.transaction(callback);
    return callback(this.conn);
  }
}

export type BranchSupplySetting = NonNullable<Awaited<ReturnType<BranchSupplySettingsRepo["get"]>>>;
