import { describe, expect, test } from "bun:test";

import { calculateLineTotal, fromStoredQuantity, toStoredQuantity } from "./quantities.js";

describe("stored quantity helpers", () => {
  test("converts whole and fractional base units to hundredths", () => {
    expect(toStoredQuantity(5)).toBe(500);
    expect(toStoredQuantity(1.25)).toBe(125);
    expect(toStoredQuantity(0.29)).toBe(29);
    expect(fromStoredQuantity(1200)).toBe(12);
  });

  test("rejects precision beyond hundredths and unsafe values", () => {
    expect(() => toStoredQuantity(1.236)).toThrow("at most two decimal places");
    expect(() => toStoredQuantity(Number.MAX_SAFE_INTEGER)).toThrow("safe integer range");
    expect(() => fromStoredQuantity(1.2)).toThrow("safe nonnegative integer");
  });

  test("calculates line totals in cents using integer arithmetic and half-up rounding", () => {
    expect(calculateLineTotal(500, 4000)).toBe(20000);
    expect(calculateLineTotal(50, 1)).toBe(1);
    expect(calculateLineTotal(0, 4000)).toBe(0);
    expect(() => calculateLineTotal(Number.MAX_SAFE_INTEGER, 101)).toThrow(
      "Line total exceeds the safe integer range",
    );
  });
});
