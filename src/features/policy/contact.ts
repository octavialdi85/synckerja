/** Official contact for privacy and account deletion (replaces /contact-us until that page exists). */
export const POLICY_CONTACT_EMAIL = "oktavialdidhanta@gmail.com";

export function policyContactMailtoHref(): string {
  return `mailto:${POLICY_CONTACT_EMAIL}`;
}
