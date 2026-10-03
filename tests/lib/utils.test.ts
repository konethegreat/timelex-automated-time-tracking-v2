import { describe, expect, it } from "vitest";
import {
  MINUTES_PER_UNIT,
  formatHours,
  hoursToUnits,
  unitsToHours,
} from "@/lib/utils";

describe("billing units (1 unit = 6 minutes)", () => {
  it("defines a unit as six minutes", () => {
    expect(MINUTES_PER_UNIT).toBe(6);
  });

  it("converts units to hours", () => {
    expect(unitsToHours(0)).toBe(0);
    expect(unitsToHours(1)).toBeCloseTo(0.1, 10);
    expect(unitsToHours(5)).toBeCloseTo(0.5, 10);
    expect(unitsToHours(10)).toBe(1);
    expect(unitsToHours(25)).toBeCloseTo(2.5, 10);
  });

  it("converts hours to the nearest whole unit", () => {
    expect(hoursToUnits(1)).toBe(10);
    expect(hoursToUnits(0.5)).toBe(5);
    expect(hoursToUnits(1.25)).toBe(13); // 12.5 units: halves round up
    expect(hoursToUnits(0.04)).toBe(0); // under 3 minutes rounds down
  });

  it("round-trips whole units without floating-point drift", () => {
    for (let units = 0; units <= 500; units++) {
      expect(hoursToUnits(unitsToHours(units))).toBe(units);
    }
  });

  it("formats hours with two decimals", () => {
    expect(formatHours(13)).toBe("1.30");
    expect(formatHours(1)).toBe("0.10");
    expect(formatHours(0)).toBe("0.00");
  });
});
