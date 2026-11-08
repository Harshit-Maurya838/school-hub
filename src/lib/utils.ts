import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a rupee amount with Indian digit grouping: ₹1,25,000 or ₹480.50. */
export function formatINR(value: number | string | { toString(): string }): string {
  const parsed = typeof value === "number" ? value : Number(value.toString());
  const num = Number.isFinite(parsed) ? parsed : 0;
  return (Number.isInteger(num) ? inrWhole : inrPaise).format(num);
}
