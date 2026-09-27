// Reports page. Aggregate metrics and a small set of charts over the
// filtered expense set. Charts are simple inline SVG bars so we don't
// need a chart library for four small visualizations.
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listDepartments, listExpenseCategories, listExpenses } from "../expenses/api";
import { type Department, type Expense, type ExpenseCategory } from "../expenses/types";
import { useCurrentUser } from "../profile/useCurrentUser";
import { userHasPermission, userIsFinance } from "../auth/permissions";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { downloadCsv } from "../expenses/useExpenseList";

function hoursBetween(a: string, b: string): number {
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

export function ReportsPage() {
  const { t } = useT();
  const me = useCurrentUser();
  const allowed = userHasPermission(me.data?.data, "bulkExport") || userIsFinance(me.data?.data);

  const expensesQuery = useQuery({ queryKey: ["reports", "expenses"], queryFn: () => listExpenses({ pageSize: 1000 }), staleTime: 30_000 });
  const departmentsQuery = useQuery({ queryKey: ["reports", "departments"], queryFn: () => listDepartments(), staleTime: 5 * 60_000 });
  const categoriesQuery = useQuery({ queryKey: ["reports", "categories"], queryFn: () => listExpenseCategories(), staleTime: 5 * 60_000 });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const departments: Department[] = departmentsQuery.data ?? [];
  const categories: ExpenseCategory[] = categoriesQuery.data ?? [];

  const filtered = useMemo(() => {
    const items = expensesQuery.data?.items ?? [];
    return items.filter((e) => {
      if (dateFrom && (e.expenseDate ?? "") < dateFrom) return false;
      if (dateTo && (e.expenseDate ?? "") > dateTo + "T23:59:59") return false;
      if (departmentFilter && e.departmentId !== departmentFilter) return false;
      if (categoryFilter && e.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [expensesQuery.data, dateFrom, dateTo, departmentFilter, categoryFilter]);

  const metrics = useMemo(() => {
    const total = filtered.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const submitted = filtered.filter((e) => e.submittedAt && e.submittedAt.length > 0);
    const rejected = filtered.filter((e) => e.status === "Rejected").length;
    const rejectionRate = submitted.length > 0 ? (rejected / submitted.length) * 100 : 0;
    const approvalTimes = filtered
      .filter((e) => e.submittedAt && e.approvedAt)
      .map((e) => hoursBetween(e.submittedAt!, e.approvedAt!));
    const avgApprovalHours = approvalTimes.length === 0 ? 0 : approvalTimes.reduce((sum, n) => sum + n, 0) / approvalTimes.length;
    const reimbursements = filtered
      .filter((e) => e.status === "Reimbursed")
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const approvalVolume = {
      approved: filtered.filter((e) => e.status === "Approved" || e.status === "Reimbursed").length,
      rejected,
      pending: filtered.filter((e) => e.status?.startsWith("Pending")).length
    };
    return { total, rejectionRate, avgApprovalHours, reimbursements, approvalVolume };
  }, [filtered]);

  const spendingByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const key = e.departmentName ?? "Other";
      map.set(key, (map.get(key) ?? 0) + (e.amount ?? 0));
    }
    return Array.from(map.entries()).map(([departmentName, amount]) => ({ departmentName, amount })).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const key = e.categoryName ?? "Other";
      map.set(key, (map.get(key) ?? 0) + (e.amount ?? 0));
    }
    return Array.from(map.entries()).map(([categoryName, amount]) => ({ categoryName, amount })).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const monthlySpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      if (!e.expenseDate) continue;
      const d = new Date(e.expenseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + (e.amount ?? 0));
    }
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  function exportCsv() {
    const rows: Array<Array<string | number>> = [
      ["Expense ID", "Description", "Employee", "Department", "Category", "Amount", "Date", "Status"]
    ];
    for (const e of filtered) {
      rows.push([
        e.expenseId ?? "",
        e.description ?? "",
        e.submittedByName ?? "",
        e.departmentName ?? "",
        e.categoryName ?? "",
        e.amount ?? 0,
        e.expenseDate ?? "",
        e.status ?? ""
      ]);
    }
    downloadCsv(`expenseflow-report-${Date.now()}.csv`, rows);
  }

  function exportPdf() {
    window.print();
  }

  if (!allowed) {
    return (
      <section>
        <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} />
        <div className="permission-denied">
          <h2>{t("common.permissionDenied")}</h2>
          <p>{t("common.permissionDeniedHelp")}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        actions={
          <>
            <button className="secondary-button" onClick={exportCsv}>
              <Download size={16} /> {t("expenses.export.csv")}
            </button>
            <button className="secondary-button" onClick={exportPdf}>
              <Download size={16} /> {t("expenses.export.pdf")}
            </button>
          </>
        }
      />

      <div className="filter-grid">
        <div className="form-field">
          <span>{t("reports.filter.dateRange")}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>
        <div className="form-field">
          <span>{t("reports.filter.department")}</span>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="">All</option>
            {departments.map((d) => <option key={d.itemId} value={d.itemId}>{d.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <span>{t("reports.filter.category")}</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.itemId} value={c.itemId}>{c.displayName ?? c.name}</option>)}
          </select>
        </div>
        <button className="secondary-button" onClick={() => { setDateFrom(""); setDateTo(""); setDepartmentFilter(""); setCategoryFilter(""); }} type="button">
          {t("common.clear")}
        </button>
      </div>

      {expensesQuery.isLoading ? (
        <div className="reports-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="metric-card"><Skeleton className="skeleton-line" /><Skeleton className="skeleton-line-lg" /></div>)}
        </div>
      ) : expensesQuery.error ? (
        <ErrorState message={t("common.error")} onRetry={() => expensesQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <div className="section-card"><p className="muted">{t("reports.empty")}</p></div>
      ) : (
        <>
          <div className="reports-grid">
            <MetricCard label={t("reports.metric.total")} value={`$${metrics.total.toFixed(2)}`} sublabel={`${filtered.length} expenses`} />
            <MetricCard label={t("reports.metric.rejectionRate")} value={`${metrics.rejectionRate.toFixed(1)}%`} sublabel={`${metrics.approvalVolume.rejected} rejected`} />
            <MetricCard label={t("reports.metric.avgApprovalTime")} value={`${metrics.avgApprovalHours.toFixed(1)}h`} sublabel="Submitted → Approved" />
            <MetricCard label={t("reports.metric.reimbursements")} value={`$${metrics.reimbursements.toFixed(2)}`} sublabel="Reimbursed in period" />
          </div>

          <div className="charts-grid" style={{ marginTop: 14 }}>
            <ChartCard title={t("reports.chart.spendingByDept")} rows={spendingByDepartment.slice(0, 6)} />
            <ChartCard title={t("reports.chart.spendingByCategory")} rows={spendingByCategory.slice(0, 6)} />
            <ChartCard title={t("reports.chart.monthlySpending")} rows={monthlySpending.slice(-6)} labelKey="month" />
            <div className="chart-card">
              <h3>{t("reports.chart.approvalMetrics")}</h3>
              <StackedBar approved={metrics.approvalVolume.approved} rejected={metrics.approvalVolume.rejected} pending={metrics.approvalVolume.pending} />
              <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "hsl(var(--success))", borderRadius: 2, marginRight: 6 }} />Approved: {metrics.approvalVolume.approved}</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "hsl(var(--destructive))", borderRadius: 2, marginRight: 6 }} />Rejected: {metrics.approvalVolume.rejected}</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "hsl(var(--warning))", borderRadius: 2, marginRight: 6 }} />Pending: {metrics.approvalVolume.pending}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({ label, sublabel, value }: { label: string; sublabel?: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sublabel ? <span className="metric-sub">{sublabel}</span> : null}
    </div>
  );
}

function ChartCard({ title, rows, labelKey }: { title: string; rows: Array<{ [k: string]: string | number }>; labelKey?: string }) {
  const max = rows.reduce((acc, r) => Math.max(acc, Number(r.amount) || 0), 0);
  if (rows.length === 0) {
    return (
      <div className="chart-card">
        <h3>{title}</h3>
        <p className="muted">No data in range.</p>
      </div>
    );
  }
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart">
        {rows.map((row, idx) => {
          const label = String(row[labelKey ?? "departmentName"] ?? row[labelKey ?? "categoryName"] ?? row[labelKey ?? "month"] ?? "");
          const value = Number(row.amount) || 0;
          const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
          return (
            <div key={`${label}-${idx}`} className="bar-chart-row">
              <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{label}</span>
              <span className="bar-chart-track"><span className="bar-chart-fill" style={{ width: `${pct}%` }} /></span>
              <span className="bar-chart-value">${value.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackedBar({ approved, rejected, pending }: { approved: number; rejected: number; pending: number }) {
  const total = approved + rejected + pending;
  if (total === 0) return <p className="muted">No data.</p>;
  const a = Math.round((approved / total) * 100);
  const r = Math.round((rejected / total) * 100);
  const p = 100 - a - r;
  return (
    <div style={{ display: "flex", height: 18, borderRadius: 6, overflow: "hidden" }}>
      <span style={{ background: "hsl(var(--success))", width: `${a}%` }} />
      <span style={{ background: "hsl(var(--destructive))", width: `${r}%` }} />
      <span style={{ background: "hsl(var(--warning))", width: `${p}%` }} />
    </div>
  );
}
