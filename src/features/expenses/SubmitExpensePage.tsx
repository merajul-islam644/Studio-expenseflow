import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import {
  listApprovalRules,
  listBudgets,
  listDepartments,
  listExpenseCategories,
  createExpense,
  bulkCreateLineItems
} from "./api";
import {
  APPROVAL_LEVEL_LABEL,
  computeRoute,
  formatUsd,
  routeSummary,
  type ApprovalRule,
  type Budget,
  type Department,
  type ExpenseCategory,
  type ExpenseLineItem,
  type ExpenseStatus
} from "./types";
import { useCurrentUser } from "../profile/useCurrentUser";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { FormField } from "../../shared/ui/FormField";
import { Alert } from "../../shared/ui/Alert";
import { Skeleton } from "../../shared/ui/Skeleton";

type DraftLineItem = {
  description: string;
  categoryId: string;
  amount: string;
  receiptFileId?: string;
  receiptFileName?: string;
  receiptFileUrl?: string;
};

function newDraft(): DraftLineItem {
  return { description: "", categoryId: "", amount: "" };
}

const RECEIPT_REQUIRED_THRESHOLD = 25;

function buildExpenseId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EX-${stamp}-${rand}`;
}

function startOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function SubmitExpensePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const me = useCurrentUser();
  const { t } = useT();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([newDraft()]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dept, cat, rule, budget] = await Promise.all([
          listDepartments(),
          listExpenseCategories(),
          listApprovalRules(),
          listBudgets()
        ]);
        if (cancelled) return;
        setDepartments(dept);
        setCategories(cat);
        setRules(rule);
        setBudgets(budget);
        if (dept.length > 0 && !departmentId) {
          // Default to first department; the seed uses Engineering for Employee role
          setDepartmentId(dept[0]?.itemId ?? "");
        }
        if (cat.length > 0 && !categoryId) {
          setCategoryId(cat[0]?.itemId ?? "");
        }
      } catch (caught) {
        if (!cancelled) setError((caught as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const total = lineItems.reduce((sum, li) => {
      const value = parseFloat(li.amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const requiredReceipt = lineItems.some((li) => {
      const value = parseFloat(li.amount);
      return Number.isFinite(value) && value >= RECEIPT_REQUIRED_THRESHOLD && !li.receiptFileId;
    });
    return { total, requiredReceipt };
  }, [lineItems]);

  const selectedDepartment = departments.find((d) => d.itemId === departmentId);
  const departmentBudget = budgets.find((b) => b.departmentId === departmentId);
  const departmentBudgetStatus = useMemo(() => {
    if (!departmentBudget) return null;
    const spent = departmentBudget.spentAmount ?? 0;
    const budget = departmentBudget.budgetAmount ?? 0;
    const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return { spent, budget, utilization };
  }, [departmentBudget]);

  const dateTooOld = useMemo(() => {
    if (!expenseDate) return false;
    const date = new Date(expenseDate);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return date < startOfDay(ninetyDaysAgo);
  }, [expenseDate]);

  const dateInFuture = useMemo(() => {
    if (!expenseDate) return false;
    const date = new Date(expenseDate);
    return date > startOfDay(new Date());
  }, [expenseDate]);

  const blocked = departmentBudgetStatus?.utilization !== undefined && departmentBudgetStatus.utilization >= 100;

  const requiredLevels = computeRoute(totals.total, rules);
  const routeLabel = routeSummary(totals.total, rules);

  function setLineItem(index: number, patch: Partial<DraftLineItem>) {
    setLineItems((items) => items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function addLineItem() {
    setLineItems((items) => [...items, newDraft()]);
  }

  function removeLineItem(index: number) {
    setLineItems((items) => items.filter((_, idx) => idx !== index));
  }

  function pickReceipt(index: number, file: File | undefined) {
    if (!file) return;
    // Demo: we don't have a real receipt storage backend wired up to
    // expense-line attachments, so we just record the file name and a
    // fake blob URL so the UI can show the chip. A real implementation
    // would upload via blocksClient.data.files and store the returned id.
    const url = URL.createObjectURL(file);
    setLineItem(index, {
      receiptFileId: `local-${Date.now()}-${index}`,
      receiptFileName: file.name,
      receiptFileUrl: url
    });
  }

  function clearReceipt(index: number) {
    setLineItem(index, { receiptFileId: undefined, receiptFileName: undefined, receiptFileUrl: undefined });
  }

  const canSubmit = !loading
    && description.length > 0
    && description.length <= 200
    && departmentId
    && categoryId
    && expenseDate
    && !dateInFuture
    && !dateTooOld
    && lineItems.length > 0
    && totals.total > 0
    && !totals.requiredReceipt
    && !blocked;

  async function submit(asDraft: boolean) {
    if (!canSubmit && !asDraft) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const expenseId = buildExpenseId();
      const firstLevel = requiredLevels[0];
      const status: ExpenseStatus = asDraft
        ? "Draft"
        : firstLevel !== undefined
          ? (`Pending L${firstLevel}` as ExpenseStatus)
          : "Submitted";
      const approverL1 = requiredLevels.includes(1) ? "Pending assignment" : undefined;
      const route = requiredLevels.map((l) => APPROVAL_LEVEL_LABEL[l]).join(" → ");

      const created = await createExpense({
        expenseId,
        description,
        departmentId,
        departmentName: selectedDepartment?.name,
        categoryId,
        categoryName: categories.find((c) => c.itemId === categoryId)?.displayName,
        expenseDate: new Date(expenseDate).toISOString(),
        amount: totals.total,
        currency: "USD",
        status,
        currentLevel: (requiredLevels[0] ?? null) as 1 | 2 | 3 | null,
        submittedByUserId: me.data?.data?.itemId ?? "",
        submittedByName: [me.data?.data?.firstName, me.data?.data?.lastName].filter(Boolean).join(" ") || me.data?.data?.email,
        submittedByEmail: me.data?.data?.email,
        approvalRoute: route,
        approverL1Name: approverL1,
        submittedAt: asDraft ? undefined : new Date().toISOString(),
        resubmitCount: 0
      });

      const parentId = (created as { data?: { itemId?: string } } | undefined)?.data?.itemId;
      if (parentId && lineItems.length > 0) {
        const items: Array<Partial<ExpenseLineItem>> = lineItems.map((li, index) => ({
          expenseId: parentId,
          description: li.description,
          categoryId: li.categoryId,
          categoryName: categories.find((c) => c.itemId === li.categoryId)?.displayName,
          amount: parseFloat(li.amount) || 0,
          receiptFileId: li.receiptFileId,
          receiptFileName: li.receiptFileName,
          receiptFileUrl: li.receiptFileUrl,
          sortOrder: index
        }));
        try {
          await bulkCreateLineItems(items);
        } catch (caught) {
          // Non-fatal: parent expense is created even if line items fail.
          // eslint-disable-next-line no-console
          console.warn("Line item creation failed", caught);
        }
      }

      onNavigate(parentId ? `/expenses/${parentId}` : "/expenses/mine");
    } catch (caught) {
      setError((caught as Error).message || "Could not save the expense.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section>
        <PageHeader title={t("expenses.new.title")} subtitle={t("expenses.new.subtitle")} />
        <div className="section-card">
          <Skeleton className="skeleton-line-lg" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
        </div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader title={t("expenses.new.title")} subtitle={t("expenses.new.subtitle")} />

      {blocked ? <Alert tone="error">{t("expenses.new.budgetBlocked")}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="section-card">
        <div className="form-grid">
          <FormField
            label={`${t("expenses.new.description")} (${description.length}/200)`}
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 200))}
            maxLength={200}
            required
            disabled={submitting}
          />
          <div className="form-field">
            <span>{t("expenses.new.department")}</span>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              required
              disabled={submitting}
            >
              {departments.map((dept) => (
                <option key={dept.itemId} value={dept.itemId}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <span>{t("expenses.new.expenseDate")}</span>
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
              disabled={submitting}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="form-field">
            <span>{t("expenses.new.category")}</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              disabled={submitting}
            >
              {categories.map((cat) => (
                <option key={cat.itemId} value={cat.itemId}>{cat.displayName ?? cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {dateInFuture || dateTooOld ? (
          <small className="form-field-error">{t("expenses.new.dateWindow")}</small>
        ) : null}

        <div>
          <div className="panel-title" style={{ marginBottom: 8 }}>
            <span>{t("expenses.new.lineItems")}</span>
          </div>
          <div className="line-items">
            {lineItems.map((li, index) => {
              const amountValue = parseFloat(li.amount);
              const needsReceipt = Number.isFinite(amountValue) && amountValue >= RECEIPT_REQUIRED_THRESHOLD;
              return (
                <div key={index} className="line-item">
                  <div className="line-item-row">
                    <div style={{ flex: 1, display: "grid", gap: 8 }}>
                      <FormField
                        label={t("expenses.new.lineDescription")}
                        value={li.description}
                        onChange={(event) => setLineItem(index, { description: event.target.value })}
                        required
                        disabled={submitting}
                      />
                      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                        <div className="form-field">
                          <span>{t("expenses.new.category")}</span>
                          <select
                            value={li.categoryId}
                            onChange={(event) => setLineItem(index, { categoryId: event.target.value })}
                            required
                            disabled={submitting}
                          >
                            <option value="">Select…</option>
                            {categories.map((cat) => (
                              <option key={cat.itemId} value={cat.itemId}>{cat.displayName ?? cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <FormField
                          label={t("expenses.new.lineAmount")}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={li.amount}
                          onChange={(event) => setLineItem(index, { amount: event.target.value })}
                          required
                          disabled={submitting}
                        />
                      </div>
                      {needsReceipt ? (
                        <small className="form-field-error">
                          {li.receiptFileId ? null : t("expenses.new.receiptRequired")}
                        </small>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {li.receiptFileId ? (
                          <span className="receipt-chip has-receipt">
                            <Upload size={12} /> {li.receiptFileName}
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => clearReceipt(index)}
                              disabled={submitting}
                              aria-label="Remove receipt"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ) : (
                          <label className="receipt-chip">
                            <Upload size={12} /> {t("expenses.new.uploadReceipt")}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ display: "none" }}
                              onChange={(event) => pickReceipt(index, event.target.files?.[0])}
                              disabled={submitting}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <span className="line-item-amount">{formatUsd(amountValue || 0)}</span>
                      {lineItems.length > 1 ? (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={t("expenses.new.removeLineItem")}
                          onClick={() => removeLineItem(index)}
                          disabled={submitting}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="secondary-button" onClick={addLineItem} disabled={submitting} style={{ marginTop: 12 }}>
            <Plus size={16} /> {t("expenses.new.addLineItem")}
          </button>
        </div>

        <div className="section-card" style={{ background: "hsl(var(--background))" }}>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <span className="kpi-label">{t("expenses.new.total")}</span>
              <strong className="kpi-value" style={{ fontSize: 28 }}>{formatUsd(totals.total)}</strong>
            </div>
            <div>
              <span className="kpi-label">{t("expenses.new.route")}</span>
              <div className="route-preview" style={{ marginTop: 8 }}>
                {requiredLevels.length === 0 ? (
                  <span className="route-summary">No approval required</span>
                ) : (
                  requiredLevels.map((level, idx) => (
                    <span key={level} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span className="route-step">
                        Level {level} — {APPROVAL_LEVEL_LABEL[level]}
                      </span>
                      {idx < requiredLevels.length - 1 ? <span className="route-arrow">→</span> : null}
                    </span>
                  ))
                )}
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>{routeLabel}</p>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ justifyContent: "flex-end" }}>
          <button className="secondary-button" onClick={() => submit(true)} disabled={submitting || !description}>
            {t("expenses.new.saveDraft")}
          </button>
          <button className="primary-button" onClick={() => submit(false)} disabled={!canSubmit || submitting}>
            {submitting ? t("common.loading") : t("expenses.new.submit")}
          </button>
        </div>
      </div>
    </section>
  );
}
