import { describe, expect, test } from "bun:test";

import {
  parseMoneyToCents,
  parseStoredQuantity,
  storedQuantityToInput,
} from "../src/lib/operational-format";

describe("operational quantity formatting", () => {
  test("converts decimal input to stored hundredths without floating point rounding", () => {
    expect(parseStoredQuantity("1")).toBe(100);
    expect(parseStoredQuantity("1.25")).toBe(125);
    expect(parseStoredQuantity("0.01")).toBe(1);
    expect(parseStoredQuantity("2,5")).toBe(250);
  });

  test("rejects invalid or over-precise quantities", () => {
    expect(parseStoredQuantity("")).toBeNull();
    expect(parseStoredQuantity("-1")).toBeNull();
    expect(parseStoredQuantity("1.234")).toBeNull();
    expect(parseStoredQuantity("not-a-number")).toBeNull();
  });

  test("keeps zero distinct from an uncounted value", () => {
    expect(storedQuantityToInput(0)).toBe("0");
    expect(storedQuantityToInput(null)).toBe("");
  });

  test("converts displayed money to integer cents", () => {
    expect(parseMoneyToCents("25")).toBe(2500);
    expect(parseMoneyToCents("25.50")).toBe(2550);
    expect(parseMoneyToCents("1.999")).toBeNull();
  });
});
