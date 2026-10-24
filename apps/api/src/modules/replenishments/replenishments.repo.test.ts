import { describe, expect, test } from "bun:test";

import { AppError } from "@/shared/errors/app-error.js";
import { calculateReplenishmentLineTotal } from "./replenishments.repo.js";

describe("calculateReplenishmentLineTotal", () => {
  test("multiplies a unit price by a quantity stored in hundredths", () => {
    expect(calculateReplenishmentLineTotal(1200, 125)).toBe(1500);
  });

  test("rounds half up to the smallest currency unit", () => {
    expect(calculateReplenishmentLineTotal(1, 50)).toBe(1);
  });

  test("returns zero for a zero requested quantity", () => {
    expect(calculateReplenishmentLineTotal(1250, 0)).toBe(0);
  });

  test("rejects unsafe and negative values", () => {
    for (const [unitCost, quantity] of [
      [-1, 100],
      [1, Number.MAX_SAFE_INTEGER + 1],
    ]) {
      expect(() => calculateReplenishmentLineTotal(unitCost, quantity)).toThrow(AppError);
    }
  });

  test("rejects totals that cannot safely be represented in the API", () => {
    expect(() => calculateReplenishmentLineTotal(Number.MAX_SAFE_INTEGER, 101)).toThrow(
      "Line total is too large",
    );
  });
});
