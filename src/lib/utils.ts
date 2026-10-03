import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** One billing unit = 6 minutes. */
export const MINUTES_PER_UNIT = 6;

/** Longest single entry a reviewer can set: 240 units = 24 hours. */
export const MAX_UNITS_PER_ENTRY = 240;

export function unitsToHours(units: number): number {
  return (units * MINUTES_PER_UNIT) / 60;
}

export function hoursToUnits(hours: number): number {
  return Math.round((hours * 60) / MINUTES_PER_UNIT);
}

export function formatHours(units: number): string {
  return unitsToHours(units).toFixed(2);
}

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

export function applyVat(subtotal: number, rate = 0.15): number {
  return subtotal * (1 + rate);
}
