// Organization section. Reads the demo organization's profile from
// local state (the seeder populates it) and lets the admin edit the
// org name, region, default currency display, and fiscal-year start
// month. Writes back to localStorage so the change is picked up by
// every page that reads it.
import { useEffect, useState } from "react";

type OrgSettings = {
  name: string;
  region: string;
  defaultCurrency: string;
  fiscalYearStartMonth: number;
};

const STORAGE_KEY = "expenseflow:org-settings";
const DEFAULTS: OrgSettings = {
  name: "ExpenseFlow Demo Co.",
  region: "en-US",
  defaultCurrency: "USD",
  fiscalYearStartMonth: 1
};

function load(): OrgSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function OrganizationSettings() {
  const [settings, setSettings] = useState<OrgSettings>(load);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [saved]);

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  return (
    <div className="section-card">
      <h3>Organization</h3>
      <p className="section-subtitle">Profile and locale for the demo organization.</p>
      <div className="form-grid">
        <div className="form-field">
          <span>Organization name</span>
          <input value={settings.name} onChange={(event) => setSettings((s) => ({ ...s, name: event.target.value }))} />
        </div>
        <div className="form-field">
          <span>Region</span>
          <input value={settings.region} onChange={(event) => setSettings((s) => ({ ...s, region: event.target.value }))} />
        </div>
        <div className="form-field">
          <span>Default currency display</span>
          <select value={settings.defaultCurrency} onChange={(event) => setSettings((s) => ({ ...s, defaultCurrency: event.target.value }))}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <div className="form-field">
          <span>Fiscal year start month</span>
          <select value={settings.fiscalYearStartMonth} onChange={(event) => setSettings((s) => ({ ...s, fiscalYearStartMonth: parseInt(event.target.value, 10) }))}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {new Date(2024, idx, 1).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-end" }}>
        <button className="primary-button" onClick={handleSave}>Save</button>
        {saved ? <span className="muted small">Saved.</span> : null}
      </div>
    </div>
  );
}
