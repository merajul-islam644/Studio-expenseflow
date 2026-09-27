// Settings page — System Admin only. Sections are switched via the
// left-hand nav; each section is its own self-contained subcomponent so
// the page file stays readable. Non-admin users see a permission-denied
// state instead.
import { useState } from "react";
import { useCurrentUser } from "../profile/useCurrentUser";
import { userHasPermission } from "../auth/permissions";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { GeneralSettings } from "./GeneralSettings";
import { OrganizationSettings } from "./OrganizationSettings";
import { UsersRolesSettings } from "./UsersRolesSettings";
import { ApprovalRulesSettings } from "./ApprovalRulesSettings";
import { BudgetsSettings } from "./BudgetsSettings";
import { CategoriesSettings } from "./CategoriesSettings";
import { RejectionReasonsSettings } from "./RejectionReasonsSettings";
import { NotificationsSettings } from "./NotificationsSettings";
import { LocalizationSettings } from "./LocalizationSettings";
import { FiscalRulesSettings } from "./FiscalRulesSettings";

type SectionKey =
  | "general"
  | "organization"
  | "users"
  | "approvalRules"
  | "budgets"
  | "categories"
  | "rejectionReasons"
  | "notifications"
  | "localization"
  | "fiscalRules";

export function SettingsPage() {
  const { t } = useT();
  const me = useCurrentUser();
  const canManage = userHasPermission(me.data?.data, "manageOrg");

  const sections: Array<{ key: SectionKey; label: string }> = [
    { key: "general", label: t("settings.sections.general") },
    { key: "organization", label: t("settings.sections.organization") },
    { key: "users", label: t("settings.sections.users") },
    { key: "approvalRules", label: t("settings.sections.approvalRules") },
    { key: "budgets", label: t("settings.sections.budgets") },
    { key: "categories", label: t("settings.sections.categories") },
    { key: "rejectionReasons", label: t("settings.sections.rejectionReasons") },
    { key: "notifications", label: t("settings.sections.notifications") },
    { key: "localization", label: t("settings.sections.localization") },
    { key: "fiscalRules", label: t("settings.sections.fiscalRules") }
  ];

  const [active, setActive] = useState<SectionKey>("general");

  if (!canManage) {
    return (
      <section>
        <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
        <div className="permission-denied">
          <h2>{t("common.permissionDenied")}</h2>
          <p>{t("common.permissionDeniedHelp")}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="settings-grid">
        <nav className="settings-nav">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={active === section.key ? "active" : ""}
              onClick={() => setActive(section.key)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <div>
          {active === "general" ? <GeneralSettings /> : null}
          {active === "organization" ? <OrganizationSettings /> : null}
          {active === "users" ? <UsersRolesSettings /> : null}
          {active === "approvalRules" ? <ApprovalRulesSettings /> : null}
          {active === "budgets" ? <BudgetsSettings /> : null}
          {active === "categories" ? <CategoriesSettings /> : null}
          {active === "rejectionReasons" ? <RejectionReasonsSettings /> : null}
          {active === "notifications" ? <NotificationsSettings /> : null}
          {active === "localization" ? <LocalizationSettings /> : null}
          {active === "fiscalRules" ? <FiscalRulesSettings /> : null}
        </div>
      </div>
    </section>
  );
}
