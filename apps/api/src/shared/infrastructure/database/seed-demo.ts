import { eq, sql } from "drizzle-orm";

import { DB, pool } from "./client.js";
import { branches } from "../../../modules/branches/branches.schema.js";
import {
  branchSupplySettings,
  branchSupplyWeeklyTargets,
  categories,
  supplies,
  supplySuppliers,
  units,
} from "../../../modules/supplies/supplies.schema.js";
import { suppliers } from "../../../modules/suppliers/suppliers.schema.js";
import { usagePurposes } from "../../../modules/usage-purposes/usage-purposes.schema.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seed data cannot be loaded in production");
}

const demoBranches = [
  { id: "f1000000-0000-4000-8000-000000000001", name: "La Mesa Centro", factor: 1 },
  { id: "f1000000-0000-4000-8000-000000000002", name: "La Mesa Norte", factor: 0.75 },
] as const;

const demoCategories = [
  { id: "f2000000-0000-4000-8000-000000000001", name: "Proteínas" },
  { id: "f2000000-0000-4000-8000-000000000002", name: "Frutas y verduras" },
  { id: "f2000000-0000-4000-8000-000000000003", name: "Lácteos" },
  { id: "f2000000-0000-4000-8000-000000000004", name: "Abarrotes" },
  { id: "f2000000-0000-4000-8000-000000000005", name: "Bebidas" },
  { id: "f2000000-0000-4000-8000-000000000006", name: "Limpieza" },
] as const;

const demoUnits = [
  { id: "f3000000-0000-4000-8000-000000000001", name: "Kilogramo", symbol: "kg" },
  { id: "f3000000-0000-4000-8000-000000000002", name: "Litro", symbol: "L" },
  { id: "f3000000-0000-4000-8000-000000000003", name: "Pieza", symbol: "pz" },
  { id: "f3000000-0000-4000-8000-000000000004", name: "Paquete", symbol: "paq" },
] as const;

const demoSuppliers = [
  {
    id: "f4000000-0000-4000-8000-000000000001",
    name: "Abasto Central Demo",
    phoneNumber: "5550101001",
    email: "abasto@example.invalid",
  },
  {
    id: "f4000000-0000-4000-8000-000000000002",
    name: "Mercado Fresco Demo",
    phoneNumber: "5550101002",
    email: "fresco@example.invalid",
  },
  {
    id: "f4000000-0000-4000-8000-000000000003",
    name: "Distribuidora Demo",
    phoneNumber: "5550101003",
    email: "distribuidora@example.invalid",
  },
] as const;

const demoPurposes = [
  {
    id: "f5000000-0000-4000-8000-000000000001",
    name: "Cocina",
    description: "Ingredientes para la preparación de alimentos",
  },
  {
    id: "f5000000-0000-4000-8000-000000000002",
    name: "Bebidas",
    description: "Bebidas para servicio y venta",
  },
  {
    id: "f5000000-0000-4000-8000-000000000003",
    name: "Limpieza",
    description: "Insumos para limpieza y operación del restaurante",
  },
] as const;

const demoSupplies = [
  {
    id: "f6000000-0000-4000-8000-000000000001",
    sku: "DEMO-RST-POLLO",
    name: "Pechuga de pollo",
    description: "Pechuga fresca sin hueso",
    unit: "kg",
    category: "Proteínas",
    supplier: "Abasto Central Demo",
    purpose: "Cocina",
    unitCost: 14900,
    targetQuantity: 1200,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000002",
    sku: "DEMO-RST-RES",
    name: "Carne molida de res",
    description: "Carne molida para cocina",
    unit: "kg",
    category: "Proteínas",
    supplier: "Abasto Central Demo",
    purpose: "Cocina",
    unitCost: 18900,
    targetQuantity: 800,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000003",
    sku: "DEMO-RST-TORTILLA",
    name: "Tortilla de maíz",
    description: "Tortilla fresca para servicio",
    unit: "kg",
    category: "Abarrotes",
    supplier: "Mercado Fresco Demo",
    purpose: "Cocina",
    unitCost: 2800,
    targetQuantity: 1500,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000004",
    sku: "DEMO-RST-JITOMATE",
    name: "Jitomate saladet",
    description: "Jitomate fresco",
    unit: "kg",
    category: "Frutas y verduras",
    supplier: "Mercado Fresco Demo",
    purpose: "Cocina",
    unitCost: 3200,
    targetQuantity: 600,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000005",
    sku: "DEMO-RST-CEBOLLA",
    name: "Cebolla blanca",
    description: "Cebolla blanca fresca",
    unit: "kg",
    category: "Frutas y verduras",
    supplier: "Mercado Fresco Demo",
    purpose: "Cocina",
    unitCost: 2600,
    targetQuantity: 500,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000006",
    sku: "DEMO-RST-AGUACATE",
    name: "Aguacate",
    description: "Aguacate fresco",
    unit: "kg",
    category: "Frutas y verduras",
    supplier: "Mercado Fresco Demo",
    purpose: "Cocina",
    unitCost: 7900,
    targetQuantity: 400,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000007",
    sku: "DEMO-RST-LECHUGA",
    name: "Lechuga romana",
    description: "Lechuga romana por pieza",
    unit: "pz",
    category: "Frutas y verduras",
    supplier: "Mercado Fresco Demo",
    purpose: "Cocina",
    unitCost: 2800,
    targetQuantity: 1200,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000008",
    sku: "DEMO-RST-QUESO",
    name: "Queso Oaxaca",
    description: "Queso Oaxaca para cocina",
    unit: "kg",
    category: "Lácteos",
    supplier: "Abasto Central Demo",
    purpose: "Cocina",
    unitCost: 12900,
    targetQuantity: 500,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000009",
    sku: "DEMO-RST-LECHE",
    name: "Leche entera",
    description: "Leche entera para cocina y bebidas",
    unit: "L",
    category: "Lácteos",
    supplier: "Distribuidora Demo",
    purpose: "Cocina",
    unitCost: 2800,
    targetQuantity: 1200,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000010",
    sku: "DEMO-RST-ARROZ",
    name: "Arroz",
    description: "Arroz blanco de grano largo",
    unit: "kg",
    category: "Abarrotes",
    supplier: "Abasto Central Demo",
    purpose: "Cocina",
    unitCost: 4500,
    targetQuantity: 1000,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000011",
    sku: "DEMO-RST-FRIJOL",
    name: "Frijol negro",
    description: "Frijol negro seco",
    unit: "kg",
    category: "Abarrotes",
    supplier: "Abasto Central Demo",
    purpose: "Cocina",
    unitCost: 5200,
    targetQuantity: 800,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000012",
    sku: "DEMO-RST-ACEITE",
    name: "Aceite vegetal",
    description: "Aceite vegetal para cocina",
    unit: "L",
    category: "Abarrotes",
    supplier: "Abasto Central Demo",
    purpose: "Cocina",
    unitCost: 4900,
    targetQuantity: 600,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000013",
    sku: "DEMO-RST-REFRESCO",
    name: "Refresco de cola",
    description: "Botella individual para servicio",
    unit: "pz",
    category: "Bebidas",
    supplier: "Distribuidora Demo",
    purpose: "Bebidas",
    unitCost: 1800,
    targetQuantity: 2400,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000014",
    sku: "DEMO-RST-JUGO",
    name: "Jugo de naranja",
    description: "Jugo de naranja para servicio",
    unit: "L",
    category: "Bebidas",
    supplier: "Distribuidora Demo",
    purpose: "Bebidas",
    unitCost: 5600,
    targetQuantity: 1000,
    mode: "fixed",
  },
  {
    id: "f6000000-0000-4000-8000-000000000015",
    sku: "DEMO-RST-LAVALOZA",
    name: "Jabón lavaloza",
    description: "Detergente líquido para loza",
    unit: "L",
    category: "Limpieza",
    supplier: "Distribuidora Demo",
    purpose: "Limpieza",
    unitCost: 5400,
    targetQuantity: null,
    mode: "on_demand",
  },
  {
    id: "f6000000-0000-4000-8000-000000000016",
    sku: "DEMO-RST-SERVILLETA",
    name: "Servilletas",
    description: "Paquete de servilletas para mesa",
    unit: "paq",
    category: "Limpieza",
    supplier: "Distribuidora Demo",
    purpose: "Limpieza",
    unitCost: 3400,
    targetQuantity: null,
    mode: "on_demand",
  },
] as const;

async function seedDemoData() {
  await DB.transaction(async (tx) => {
    const branchIds = new Map<string, string>();
    for (const branch of demoBranches) {
      const [row] = await tx
        .insert(branches)
        .values({ id: branch.id, name: branch.name })
        .onConflictDoUpdate({ target: branches.name, set: { name: branch.name } })
        .returning({ id: branches.id });
      branchIds.set(branch.name, row!.id);
    }

    const categoryIds = new Map<string, string>();
    for (const category of demoCategories) {
      const [row] = await tx
        .insert(categories)
        .values(category)
        .onConflictDoUpdate({ target: categories.name, set: { name: category.name } })
        .returning({ id: categories.id });
      categoryIds.set(category.name, row!.id);
    }

    const unitIds = new Map<string, string>();
    for (const unit of demoUnits) {
      const [row] = await tx
        .insert(units)
        .values(unit)
        .onConflictDoUpdate({
          target: units.name,
          set: { symbol: unit.symbol, active: true, updatedAt: new Date() },
        })
        .returning({ id: units.id });
      unitIds.set(unit.symbol, row!.id);
    }

    const supplierIds = new Map<string, string>();
    for (const supplier of demoSuppliers) {
      const [row] = await tx
        .insert(suppliers)
        .values(supplier)
        .onConflictDoUpdate({
          target: suppliers.name,
          set: { phoneNumber: supplier.phoneNumber, email: supplier.email },
        })
        .returning({ id: suppliers.id });
      supplierIds.set(supplier.name, row!.id);
    }

    const purposeIds = new Map<string, string>();
    for (const purpose of demoPurposes) {
      const [existing] = await tx
        .select({ id: usagePurposes.id })
        .from(usagePurposes)
        .where(sql`lower(${usagePurposes.name}) = lower(${purpose.name})`);
      if (existing) {
        await tx
          .update(usagePurposes)
          .set({ description: purpose.description, active: true })
          .where(eq(usagePurposes.id, existing.id));
        purposeIds.set(purpose.name, existing.id);
        continue;
      }

      const [created] = await tx
        .insert(usagePurposes)
        .values({ ...purpose, active: true })
        .onConflictDoNothing()
        .returning({ id: usagePurposes.id });
      if (!created) throw new Error(`Could not seed usage purpose ${purpose.name}`);
      purposeIds.set(purpose.name, created.id);
    }

    const supplyRows = new Map<string, string>();
    for (const supply of demoSupplies) {
      const [row] = await tx
        .insert(supplies)
        .values({
          id: supply.id,
          sku: supply.sku,
          name: supply.name,
          description: supply.description,
          unitId: unitIds.get(supply.unit)!,
          categoryId: categoryIds.get(supply.category)!,
          unitCost: supply.unitCost,
          active: true,
          trackInventory: true,
        })
        .onConflictDoUpdate({
          target: supplies.sku,
          set: {
            name: supply.name,
            description: supply.description,
            unitId: unitIds.get(supply.unit)!,
            categoryId: categoryIds.get(supply.category)!,
            unitCost: supply.unitCost,
            active: true,
            trackInventory: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: supplies.id });
      supplyRows.set(supply.sku, row!.id);
      await tx
        .insert(supplySuppliers)
        .values({ supplyId: row!.id, supplierId: supplierIds.get(supply.supplier)! })
        .onConflictDoNothing();
    }

    for (const branch of demoBranches) {
      for (const supply of demoSupplies) {
        const supplyId = supplyRows.get(supply.sku)!;
        const [setting] = await tx
          .insert(branchSupplySettings)
          .values({
            branchId: branchIds.get(branch.name)!,
            supplyId,
            mode: supply.mode,
            defaultUsagePurposeId: purposeIds.get(supply.purpose)!,
            active: true,
          })
          .onConflictDoUpdate({
            target: [branchSupplySettings.branchId, branchSupplySettings.supplyId],
            set: {
              mode: supply.mode,
              defaultUsagePurposeId: purposeIds.get(supply.purpose)!,
              active: true,
              updatedAt: new Date(),
            },
          })
          .returning({ id: branchSupplySettings.id });

        await tx
          .delete(branchSupplyWeeklyTargets)
          .where(eq(branchSupplyWeeklyTargets.branchSupplySettingId, setting!.id));

        if (supply.targetQuantity !== null) {
          const weeklyTargets = Array.from({ length: 7 }, (_, index) => {
            const weekday = index + 1;
            const dayFactor = weekday === 7 ? 0.8 : 1;
            return {
              branchSupplySettingId: setting!.id,
              weekday,
              targetQuantity: Math.round(supply.targetQuantity! * branch.factor * dayFactor),
            };
          });
          await tx.insert(branchSupplyWeeklyTargets).values(weeklyTargets);
        }
      }
    }
  });
}

try {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed data cannot be loaded in production");
  }
  await seedDemoData();
  console.log(
    `Demo restaurant data is ready: ${demoBranches.length} branches, ${demoSupplies.length} supplies, ${demoSuppliers.length} suppliers.`,
  );
} finally {
  await pool.end();
}
