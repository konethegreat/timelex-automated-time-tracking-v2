import { Prisma } from "@prisma/client";
import { MINUTES_PER_UNIT } from "@/lib/utils";

/**
 * Value of a time entry in rand: units of 6 minutes at an hourly rate.
 *
 * Uses decimal arithmetic rather than floating point, so the same inputs always
 * give the same cents, and a half cent rounds up (3 units at R1000.55/h is
 * R300.165, which is R300.17; floating point gave R300.16).
 *
 * Server-side only: it imports the Prisma client, which must not end up in a
 * browser bundle (use `unitsToHours` from `@/lib/utils` there).
 */
export function entryValue(
  units: number,
  hourlyRate: Prisma.Decimal.Value,
): Prisma.Decimal {
  return new Prisma.Decimal(hourlyRate)
    .mul(units)
    .mul(MINUTES_PER_UNIT)
    .div(60)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
