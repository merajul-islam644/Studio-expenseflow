// Local-preference section: default theme, default landing page. These
// are stored in localStorage so they survive across reloads without any
// server round trip; the Admin can change the org-wide default but the
// per-user preference always wins on their device.
import { useEffect, useState } from "react";
import { useTheme } from "../../app/providers/ThemeProvider";
import { useT } from "../../lib/i18n/LocalizationProvider";

const LANDING_KEY = "expenseflow:default-landing";

export function GeneralSettings() {
  const { theme, setTheme } = useTheme();
  const { t } = useT();
  const [landing, setLanding] = useState<string>(() => localStorage.getItem(LANDING_KEY) || "/");

  useEffect(() => {
    localStorage.setItem(LANDING_KEY, landing);
  }, [landing]);

  return (
    <div className="section-card">
      <h3>General</h3>
      <p className="section-subtitle">Set the brand label, default theme, and default landing page for new users.</p>
      <div className="form-grid">
        <div className="form-field">
          <span>Brand label</span>
          <input value="ExpenseFlow" readOnly />
        </div>
        <div className="form-field">
          <span>Default theme</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="form-field">
          <span>Default landing page</span>
          <select value={landing} onChange={(event) => setLanding(event.target.value)}>
            <option value="/">Dashboard</option>
            <option value="/expenses">All Expenses</option>
            <option value="/expenses/mine">My Expenses</option>
            <option value="/expenses/pending">Pending Approvals</option>
            <option value="/budgets">Budgets</option>
            <option value="/reports">Reports</option>
            <option value="/alerts">Alerts</option>
          </select>
        </div>
        <div className="form-field">
          <span>Default region</span>
          <input value="en-US" readOnly />
        </div>
      </div>
    </div>
  );
}
