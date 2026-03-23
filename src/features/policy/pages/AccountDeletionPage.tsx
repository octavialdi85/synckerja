import React from "react";
import { Link } from "react-router-dom";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { POLICY_CONTACT_EMAIL, policyContactMailtoHref } from "@/features/policy/contact";

const BASE_URL = "https://app.profitloop.id";

const sectionClass = "mb-6";
const headingClass = "text-lg font-semibold text-slate-800 mt-8 mb-4 first:mt-0";
const paraClass = "text-slate-700 mb-4 leading-relaxed";
const listClass = "list-decimal pl-6 mb-4 space-y-2 text-slate-700";

/** Public page for Google Play Data safety — account deletion URL (no login). */
export default function AccountDeletionPage() {
  const { t } = useAppTranslation();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 shrink-0">
            {t("policy.accountDeletion.backToApp", "Back to app")}
          </Link>
          <span className="text-sm font-medium text-slate-700 truncate">
            {t("policy.accountDeletion.brand", "ProfitLoop")}
          </span>
        </div>
      </div>
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-10">
          <header className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {t("policy.accountDeletion.title", "Account and data deletion")}
            </h1>
            <p className="text-sm text-slate-500">
              {t("policy.accountDeletion.lastUpdated", "Last updated: 23 March 2026")}
            </p>
          </header>

          <section className={sectionClass}>
            <p className={paraClass}>
              {t(
                "policy.accountDeletion.intro",
                "This page explains how to request deletion of your ProfitLoop account and related data.",
              )}
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>{t("policy.accountDeletion.scopeTitle", "What we delete")}</h2>
            <p className={paraClass}>
              {t(
                "policy.accountDeletion.scopeBody",
                "After we verify your request, we will deactivate your account and schedule deletion of personal data associated with your account.",
              )}
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>{t("policy.accountDeletion.timelineTitle", "Timeline")}</h2>
            <p className={paraClass}>
              {t(
                "policy.accountDeletion.timelineBody",
                "Deletion is usually completed shortly after your request is approved. Backups may delay full deletion for up to approximately 30 days.",
              )}
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>{t("policy.accountDeletion.howTitle", "How to request deletion")}</h2>
            <ol className={listClass}>
              <li>{t("policy.accountDeletion.howStep1", "Send an email from your registered address with a clear subject.")}</li>
              <li>{t("policy.accountDeletion.howStep2", "Include your name, account email, and organization if applicable.")}</li>
              <li>{t("policy.accountDeletion.howStep3", "We will confirm and process your request.")}</li>
            </ol>
          </section>

          <section className={sectionClass}>
            <h2 className={headingClass}>{t("policy.accountDeletion.contactTitle", "Contact")}</h2>
            <p className={paraClass}>
              {t(
                "policy.accountDeletion.contactBody",
                "For account deletion requests and other privacy questions:",
              )}
            </p>
            <p className={paraClass}>
              <a
                href={policyContactMailtoHref()}
                className="text-blue-600 hover:underline break-all"
              >
                {POLICY_CONTACT_EMAIL}
              </a>
            </p>
            <p className={paraClass}>
              <Link to="/policy/privacy" className="text-blue-600 hover:underline">
                {t("policy.accountDeletion.privacyLink", "Privacy Policy")}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
