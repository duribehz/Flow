import { z } from "@hono/zod-openapi";

export const storedQuantitySchema = z
  .number()
  .int()
  .safe()
  .nonnegative()
  .describe(
    "Stored quantity as a nonnegative integer in hundredths of the base unit (100 = 1 unit).",
  );

export const moneyCentsSchema = z
  .number()
  .int()
  .safe()
  .nonnegative()
  .describe("Money amount in integer cents.");

export function toStoredQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError("Quantity must be a finite nonnegative number");
  }

  const source = quantity.toString().toLowerCase();
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(source);
  if (!match) throw new RangeError("Quantity must be a finite nonnegative number");

  const integerPart = match[1]!;
  const fractionPart = match[2] ?? "";
  const exponent = Number(match[3] ?? 0);
  const digits = BigInt(`${integerPart}${fractionPart}`);
  const decimalPlaces = fractionPart.length - exponent;
  let stored: bigint;

  if (decimalPlaces <= 2) {
    stored = digits * 10n ** BigInt(2 - decimalPlaces);
  } else {
    const divisor = 10n ** BigInt(decimalPlaces - 2);
    if (digits % divisor !== 0n) {
      throw new RangeError("Quantity supports at most two decimal places");
    }
    stored = digits / divisor;
  }

  if (stored > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Stored quantity exceeds the safe integer range");
  }
  return Number(stored);
}

export function fromStoredQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError("Stored quantity must be a safe nonnegative integer");
  }
  return quantity / 100;
}

export function calculateLineTotal(storedQuantity: number, unitCostCents: number) {
  if (
    !Number.isSafeInteger(storedQuantity) ||
    !Number.isSafeInteger(unitCostCents) ||
    storedQuantity < 0 ||
    unitCostCents < 0
  ) {
    throw new RangeError("Quantity and unit cost must be safe nonnegative integers");
  }

  const total = (BigInt(storedQuantity) * BigInt(unitCostCents) + 50n) / 100n;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Line total exceeds the safe integer range");
  }
  return Number(total);
}

export function assertSafeStoredQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError("Stored quantity must be a safe nonnegative integer");
  }
  return quantity;
}
