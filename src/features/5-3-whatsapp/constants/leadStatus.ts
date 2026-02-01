/**
 * Lead status names as stored in DB (lead_statuses.name).
 * Used to block outbound when conversation is Resolved (Closed).
 */
export const RESOLVED_STATUS_NAME = 'Closed';

export function isResolvedStatus(name: string | null | undefined): boolean {
  if (name == null || name === '') return false;
  return name.trim().toLowerCase() === 'closed';
}
