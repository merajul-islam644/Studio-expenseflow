// Budgets page. Shows one card per department with the current
// utilization, status, and spent/remaining/total breakdown. Admins
// (and finance) can edit the monthly amount; the rest see read-only
// cards. Status thresholds live in the same place the rest of the app
// uses (the budget card itself) -- 0–79% Normal, 80–99% Warning,
// 100% Blocked.
import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listBudgets, updateBudget } from "../expenses/api";
import { formatUsd, type Budget } from "../expenses/types";
import { useCurrentUser } from "../profile/useCurrentUser";
import { userHasPermission, userIsFinance } from "../auth/permissions";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

function statusFromUtilization(utilization: number): "Normal" | "Warning" | "Blocked" {
  if (utilization >= 100) return "Blocked";
  if (utilization >= 80) return "Warning";
  return "Normal";
}

export function BudgetsPage() {
  const { t } = useT();
  const me = useCurrentUser();
  const canEdit = userHasPermission(me.data?.data, "manageOrg") || userIsFinance(me.data?.data);
  const queryClient = useQueryClient();
  const budgetsQuery = useQuery({
    queryKey: ["budgets", "list"],
    queryFn: () => listBudgets(),
    staleTime: 30_000
  });

  const [editingId, setEditingId] = useState<string | undefined>();
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const budgets = budgetsQuery.data ?? [];

  function startEdit(budget: Budget) {
    setEditingId(budget.itemId);
    setEditValue(String(budget.budgetAmount ?? 0));
    setError(undefined);
  }

  function cancelEdit() {
    setEditingId(undefined);
    setEditValue("");
    setError(undefined);
  }

  async function saveEdit(budget: Budget) {
    if (!budget.itemId) return;
    const amount = parseFloat(editValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await updateBudget(budget.itemId, { budgetAmount: amount });
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      cancelEdit();
    } catch (caught) {
      setError((caught as Error).message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader title={t("budgets.title")} subtitle={t("budgets.subtitle")} />

      {budgetsQuery.isLoading ? (
        <div className="budget-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="budget-card">
              <Skeleton className="skeleton-line-lg" />
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line" />
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="section-card">
          <p className="muted">No budgets configured yet.</p>
        </div>
      ) : (
        <div className="budget-grid">
          {budgets.map((b) => {
            const spent = b.spentAmount ?? 0;
            const total = b.budgetAmount ?? 0;
            const remaining = Math.max(0, total - spent);
            const utilization = total > 0 ? Math.round((spent / total) * 100) : 0;
            const status = statusFromUtilization(utilization);
            const isEditing = editingId === b.itemId;
            return (
              <div key={b.itemId} className={["budget-card", `budget-${status.toLowerCase()}`].join(" ")}>
                <div className="budget-card-head">
                  <h3>{b.departmentName ?? "—"}</h3>
                  <StatusBadge status={status} />
                </div>
                {isEditing ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div className="form-field">
                      <span>{t("budgets.amountLabel")}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                      />
                    </div>
                    {error ? <small className="form-field-error">{error}</small> : null}
                    <div className="form-actions">
                      <button className="secondary-button" onClick={cancelEdit} disabled={saving}>
                        <X size={16} /> {t("common.cancel")}
                      </button>
                      <button className="primary-button" onClick={() => saveEdit(b)} disabled={saving}>
                        <Save size={16} /> {saving ? t("common.loading") : t("budgets.save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="budget-amount">{formatUsd(spent)}</span>
                    <span className="muted small">spent of {formatUsd(total)}</span>
                    <div className="budget-track">
                      <span
                        className="budget-fill"
                        style={{
                          width: `${Math.min(100, utilization)}%`,
                          background: status === "Blocked" ? "hsl(var(--destructive))" : status === "Warning" ? "hsl(var(--warning))" : "hsl(var(--primary))"
                        }}
                      />
                    </div>
                    <div className="budget-meta">
                      <span>Remaining: {formatUsd(remaining)}</span>
                      <span>{utilization}% used</span>
                    </div>
                    <p className="budget-message">
                      {status === "Blocked" ? (
                        <strong>{b.departmentName} has reached its monthly budget. New expenses are currently blocked.</strong>
                      ) : status === "Warning" ? (
                        <span>
                          <strong>{b.departmentName} has used {utilization}% of its monthly budget.</strong>
                        </span>
                      ) : (
                        <span className="muted">{b.departmentName} is within budget.</span>
                      )}
                    </p>
                    {canEdit ? (
                      <div className="form-actions">
                        <button className="secondary-button" onClick={() => startEdit(b)}>
                          <Pencil size={16} /> {t("budgets.editAmount")}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: "Normal" | "Warning" | "Blocked" }) {
  const tone = status === "Blocked" ? "error" : status === "Warning" ? "warn" : "good";
  return (
    <span className={`pill pill-${tone}`}>{status}</span>
  );
}

// Suppress unused-warning for hooks used in sub-files.
void useEffect; void useState;
