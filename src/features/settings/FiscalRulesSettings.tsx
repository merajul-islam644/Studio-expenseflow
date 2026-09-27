// Fiscal Rules admin screen — fiscal year start month and period close
// behavior. Stored in localStorage (the actual period-close flow runs
// against the same data the Organization settings write to, so a real
// app would unify these into a single Org-config record).
import { useEffect, useState } from "react";

const STORAGE_KEY = "expenseflow:fiscal-rules";

type FiscalRules = {
  startMonth: number;
  closeBehavior: "auto" | "manual";
};

const DEFAULTS: FiscalRules = {
  startMonth: 1,
  closeBehavior: "manual"
};

function load(): FiscalRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function FiscalRulesSettings() {
  const [rules, setRules] = useState<FiscalRules>(load);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [saved]);

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    setSaved(true);
  }

  return (
    <div className="section-card">
      <h3>Fiscal Rules</h3>
      <p className="section-subtitle">Fiscal year start month and period close behavior.</p>
      <div className="form-grid">
        <div className="form-field">
          <span>Fiscal year start month</span>
          <select value={rules.startMonth} onChange={(event) => setRules((r) => ({ ...r, startMonth: parseInt(event.target.value, 10) }))}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {new Date(2024, idx, 1).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <span>Period close behavior</span>
          <select value={rules.closeBehavior} onChange={(event) => setRules((r) => ({ ...r, closeBehavior: event.target.value as "auto" | "manual" }))}>
            <option value="manual">Manual — admin closes each period</option>
            <option value="auto">Automatic — close on month end</option>
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
