import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { entryValue } from "@/lib/billing";

describe("entryValue", () => {
  it("values whole-hour and part-hour entries (10 units = 1 hour)", () => {
    expect(entryValue(10, "3500.00").toFixed(2)).toBe("3500.00");
    expect(entryValue(3, "3500.00").toFixed(2)).toBe("1050.00");
    expect(entryValue(1, "3500.00").toFixed(2)).toBe("350.00");
    expect(entryValue(0, "3500.00").toFixed(2)).toBe("0.00");
  });

  it("accepts the rate as a string, a number or a Decimal", () => {
    expect(entryValue(2, "2200.00").toFixed(2)).toBe("440.00");
    expect(entryValue(2, 2200).toFixed(2)).toBe("440.00");
    expect(entryValue(2, new Prisma.Decimal("2200.00")).toFixed(2)).toBe("440.00");
  });

  it("rounds a half cent up", () => {
    // 3 units = 0.3 h; 0.3 x R1000.55 = R300.165. Floating point gave R300.16.
    expect(entryValue(3, "1000.55").toFixed(2)).toBe("300.17");
    // 5 units = 0.5 h; 0.5 x R1000.55 = R500.275. Floating point gave R500.27.
    expect(entryValue(5, "1000.55").toFixed(2)).toBe("500.28");
    expect(entryValue(1, "1.15").toFixed(2)).toBe("0.12");
  });

  it("rounds a value below half a cent down", () => {
    // 1 unit = 0.1 h; 0.1 x R1000.54 = R100.054
    expect(entryValue(1, "1000.54").toFixed(2)).toBe("100.05");
  });

  it("matches exact integer arithmetic on a sweep of rates and durations", () => {
    // Independent check: value in cents = round-half-up(units x rate in cents / 10).
    let checked = 0;
    for (let cents = 100; cents <= 500_000; cents += 997) {
      for (let units = 1; units <= 12; units++) {
        const expectedCents = Math.floor((units * cents + 5) / 10);
        const actual = entryValue(units, (cents / 100).toFixed(2)).mul(100);
        expect(actual.toFixed(0), `${units} units at ${cents} cents/h`).toBe(
          String(expectedCents),
        );
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });
});
