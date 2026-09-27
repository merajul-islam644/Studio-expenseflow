// Notification toggles admin screen. The toggles map 1:1 to the
// notification categories the rest of the app sends. Stored in
// localStorage so the change persists across reloads.
import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";

const STORAGE_KEY = "expenseflow:notification-toggles";

type Toggles = Record<string, boolean>;

const DEFAULT_TOGGLES: Toggles = {
  approval_required: true,
  expense_approved: true,
  expense_rejected: true,
  budget_warning: true,
  budget_blocked: true,
  expense_submitted: true,
  reimbursement_processed: true
};

export function NotificationsSettings() {
  const { t } = useT();
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setToggles({ ...DEFAULT_TOGGLES, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [saved]);

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles));
    setSaved(true);
  }

  const entries: Array<{ key: string; label: string }> = [
    { key: "approval_required", label: t("settings.notifications.approvalRequired") },
    { key: "expense_approved", label: t("settings.notifications.expenseApproved") },
    { key: "expense_rejected", label: t("settings.notifications.expenseRejected") },
    { key: "budget_warning", label: t("settings.notifications.budgetWarning") },
    { key: "budget_blocked", label: t("settings.notifications.budgetBlocked") },
    { key: "expense_submitted", label: t("settings.notifications.expenseSubmitted") },
    { key: "reimbursement_processed", label: t("settings.notifications.reimbursementProcessed") }
  ];

  return (
    <div className="section-card">
      <h3>Notifications</h3>
      <p className="section-subtitle">{t("settings.notifications.toggles")}</p>
      <div style={{ display: "grid", gap: 12 }}>
        {entries.map((entry) => (
          <label key={entry.key} style={{ alignItems: "center", display: "flex", gap: 10 }}>
            <input
              type="checkbox"
              checked={toggles[entry.key] !== false}
              onChange={(event) => setToggles((current) => ({ ...current, [entry.key]: event.target.checked }))}
            />
            <span>{entry.label}</span>
          </label>
        ))}
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="primary-button" onClick={handleSave}>{t("common.save")}</button>
        {saved ? <span className="muted small">Saved.</span> : null}
      </div>
    </div>
  );
}
