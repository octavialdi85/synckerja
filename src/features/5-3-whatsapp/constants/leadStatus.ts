/**
 * Lead status names as stored in DB (lead_statuses.name).
 * Used to block outbound when conversation is Resolved.
 * DB may store "Closed" or "Resolve" depending on org; both must block send.
 */
export const RESOLVED_STATUS_NAME = 'Closed';

const RESOLVED_NAMES = ['closed', 'resolve'] as const;

export function isResolvedStatus(name: string | null | undefined): boolean {
  if (name == null || name === '') return false;
  const normalized = name.trim().toLowerCase();
  return RESOLVED_NAMES.includes(normalized as (typeof RESOLVED_NAMES)[number]);
}
