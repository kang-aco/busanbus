import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip HTML tags from a string (e.g. Google Directions html_instructions). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract the human-readable route number from a lineNo/lineId field.
 * Some API responses return composite IDs like "BUS:1003"; this returns "1003".
 * Coerces to string first — API responses sometimes return numeric values.
 */
export function routeDisplayNumber(lineNo?: string | number, lineId?: string | number): string {
  return String(lineNo ?? lineId ?? "").split(":").pop() || "";
}
