/**
 * Ref used to signal that the Brief modal is open for a given plan.
 * When set, useRealtimeSocialMedia skips refetch on social_media_plans changes
 * so the modal does not get closed by row unmount/re-render.
 */
const ref: { current: string | null } = { current: null };

export function getBriefModalOpenPlanId(): string | null {
  return ref.current;
}

export function setBriefModalOpenPlanId(planId: string | null): void {
  ref.current = planId;
}
