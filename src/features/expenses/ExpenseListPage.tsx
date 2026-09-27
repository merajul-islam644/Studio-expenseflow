import { useEffect, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { StatusPill } from "../../shared/ui/StatusPill";
import {
  ALL_TABS,
  STATUS_OPTIONS,
  downloadCsv,
  useExpenseList
} from "./useExpenseList";
import { type ExpenseTab } from "./useExpenseList";
import { listDepartments, listExpenseCategories } from "./api";
import { formatDate, formatUsd, statusTone, type Department, type ExpenseCategory } from "./types";
import { useCurrentUser } from "../profile/useCurrentUser";
import { userHasPermission } from "../auth/permissions";
import { useQuery } from "@tanstack/react-query";

function TabBar({ tab, onChange }: { tab: ExpenseTab; onChange: (next: ExpenseTab) => void }) {
  const { t } = useT();
  return (
    <div className="tabs" role="tablist">
      {ALL_TABS.map((entry) => (
        <button
          key={entry.key}
          type="button"
          className={["tab", tab === entry.key ? "active" : ""].filter(Boolean).join(" ")}
          role="tab"
          aria-selected={tab === entry.key}
          onClick={() => onChange(entry.key)}
        >
          {t(entry.labelKey)}
        </button>
      ))}
    </div>
  );
}

export function ExpenseListPage({ tab, onNavigate }: { tab: ExpenseTab; onNavigate: (path: string) => void }) {
  const { t } = useT();
  const me = useCurrentUser();
  const canExport = userHasPermission(me.data?.data, "bulkExport");
  const [activeTab, setActiveTab] = useState<ExpenseTab>(tab);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { items, total, isLoading, error, filters, reset } = useExpenseList(activeTab, page, pageSize);

  useEffect(() => {
    setActiveTab(tab);
    setPage(1);
  }, [tab]);

  const departmentsQuery = useQuery({ queryKey: ["expenses", "departments"], queryFn: listDepartments, staleTime: 5 * 60_000 });
  const categoriesQuery = useQuery({ queryKey: ["expenses", "categories"], queryFn: listExpenseCategories, staleTime: 5 * 60_000 });
  const departments: Department[] = departmentsQuery.data ?? [];
  const categories: ExpenseCategory[] = categoriesQuery.data ?? [];

  const titles: Record<ExpenseTab, { title: string; subtitle: string }> = {
    all: { title: t("expenses.all.title"), subtitle: t("expenses.all.subtitle") },
    mine: { title: t("expenses.mine.title"), subtitle: t("expenses.mine.subtitle") },
    pending: { title: t("expenses.pending.title"), subtitle: t("expenses.pending.subtitle") },
    approved: { title: t("expenses.tabs.approved"), subtitle: "Approved and reimbursed" },
    rejected: { title: t("expenses.tabs.rejected"), subtitle: "Rejected and needing revision" }
  };

  function handleExport(kind: "csv" | "pdf") {
    if (kind === "csv") {
      const rows: Array<Array<string | number>> = [];
      rows.push(["ID", "Description", "Employee", "Department", "Category", "Amount", "Date", "Status", "Current approver"]);
      // Pull all (not just the page) for the export.
      // We use the same filter pipeline by reusing `items` plus paged extras.
      // For simplicity, export the current visible items.
      for (const e of items) {
        rows.push([
          e.expenseId ?? "",
          e.description ?? "",
          e.submittedByName ?? e.submittedByEmail ?? "",
          e.departmentName ?? "",
          e.categoryName ?? "",
          e.amount ?? 0,
          e.expenseDate ?? "",
          e.status ?? "",
          e.approvalRoute ?? ""
        ]);
      }
      downloadCsv(`expenses-${activeTab}-${Date.now()}.csv`, rows);
      return;
    }
    if (kind === "pdf") {
      // Lightweight "PDF" via the browser print-to-PDF dialog. Real PDF
      // generation requires a server; the in-browser window.print() path
      // is what the rest of the app uses.
      window.print();
    }
  }

  return (
    <section>
      <PageHeader
        title={titles[activeTab].title}
        subtitle={titles[activeTab].subtitle}
        actions={
          activeTab === "all" || activeTab === "mine" ? (
            <button className="primary-button" onClick={() => onNavigate("/expenses/new")}>
              <Plus size={16} /> {t("expenses.new.title")}
            </button>
          ) : null
        }
      />

      <TabBar tab={activeTab} onChange={(next) => { setActiveTab(next); setPage(1); }} />

      <div className="toolbar">
        <div style={{ position: "relative" }} className="search-input-wrap">
          <Search size={16} style={{ position: "absolute", left: 10, top: 12, color: "hsl(var(--muted-foreground))" }} />
          <input
            type="search"
            className="search-input"
            style={{ paddingLeft: 32 }}
            placeholder={t("expenses.search.help")}
            value={filters.search}
            onChange={(event) => { filters.setSearch(event.target.value); setPage(1); }}
          />
        </div>
        <div className="toolbar-actions">
          {canExport ? (
            <>
              <button className="secondary-button" onClick={() => handleExport("csv")}>
                <Download size={16} /> {t("expenses.export.csv")}
              </button>
              <button className="secondary-button" onClick={() => handleExport("pdf")}>
                <Download size={16} /> {t("expenses.export.pdf")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="filter-grid">
        <div className="form-field">
          <span>{t("expenses.filter.status")}</span>
          <select value={filters.status} onChange={(event) => { filters.setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <span>{t("expenses.filter.department")}</span>
          <select value={filters.departmentId} onChange={(event) => { filters.setDepartmentId(event.target.value); setPage(1); }}>
            <option value="">All departments</option>
            {departments.map((dept) => (
              <option key={dept.itemId} value={dept.itemId}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <span>{t("expenses.filter.category")}</span>
          <select value={filters.categoryId} onChange={(event) => { filters.setCategoryId(event.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.itemId} value={cat.itemId}>{cat.displayName ?? cat.name}</option>
            ))}
          </select>
        </div>
        <button className="secondary-button" onClick={reset} type="button">{t("common.clear")}</button>
      </div>

      <div className="filter-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <FormNumeric label={t("expenses.filter.amountMin")} value={filters.amountMin} onChange={(value) => { filters.setAmountMin(value); setPage(1); }} />
        <FormNumeric label={t("expenses.filter.amountMax")} value={filters.amountMax} onChange={(value) => { filters.setAmountMax(value); setPage(1); }} />
        <div className="form-field">
          <span>{t("expenses.filter.dateFrom")}</span>
          <input type="date" value={filters.dateFrom} onChange={(event) => { filters.setDateFrom(event.target.value); setPage(1); }} />
        </div>
        <div className="form-field">
          <span>{t("expenses.filter.dateTo")}</span>
          <input type="date" value={filters.dateTo} onChange={(event) => { filters.setDateTo(event.target.value); setPage(1); }} />
        </div>
      </div>

      {isLoading ? (
        <div className="panel">
          <Skeleton className="skeleton-line-lg" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
        </div>
      ) : error ? (
        <ErrorState message={t("common.error")} onRetry={() => window.location.reload()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("expenses.empty.title")}
          description={t("expenses.empty.description")}
          action={activeTab !== "pending" ? (
            <button className="primary-button" onClick={() => onNavigate("/expenses/new")}>
              <Plus size={16} /> {t("expenses.new.title")}
            </button>
          ) : null}
        />
      ) : (
        <>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>{t("expenses.columns.id")}</th>
                  <th>{t("expenses.columns.employee")}</th>
                  <th>{t("expenses.columns.department")}</th>
                  <th>{t("expenses.columns.description")}</th>
                  <th>{t("expenses.columns.category")}</th>
                  <th>{t("expenses.columns.amount")}</th>
                  <th>{t("expenses.columns.date")}</th>
                  <th>{t("expenses.columns.status")}</th>
                  <th>{t("expenses.columns.currentApprover")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((expense) => (
                  <tr key={expense.itemId} tabIndex={0} onClick={() => expense.itemId && onNavigate(`/expenses/${expense.itemId}`)}>
                    <td data-label="ID">{expense.expenseId ?? "—"}</td>
                    <td data-label="Employee">{expense.submittedByName ?? expense.submittedByEmail ?? "—"}</td>
                    <td data-label="Department">{expense.departmentName ?? "—"}</td>
                    <td data-label="Description">{expense.description}</td>
                    <td data-label="Category">{expense.categoryName ?? "—"}</td>
                    <td data-label="Amount">{formatUsd(expense.amount)}</td>
                    <td data-label="Date">{formatDate(expense.expenseDate)}</td>
                    <td data-label="Status"><StatusPill tone={statusTone(expense.status)}>{expense.status ?? "—"}</StatusPill></td>
                    <td data-label="Current approver">{expense.approvalRoute ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="toolbar" style={{ marginTop: 12 }}>
            <span className="muted">{total} results</span>
            <div className="toolbar-actions">
              <button className="secondary-button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("common.previous")}
              </button>
              <span className="muted">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button className="secondary-button" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
                {t("common.next")}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function FormNumeric({ label, onChange, value }: { label: string; onChange: (next: string) => void; value: string }) {
  return (
    <div className="form-field">
      <span>{label}</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
