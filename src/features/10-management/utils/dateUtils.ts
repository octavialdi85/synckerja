/**
 * Format a date for subscription UI (id-ID locale).
 * @param value - ISO date string or null/undefined
 * @param options.month - 'long' (default) or 'short'
 */
export function formatSubscriptionDate(
  value?: string | null,
  options?: { month?: "long" | "short" },
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: options?.month ?? "long",
    year: "numeric",
  });
}
