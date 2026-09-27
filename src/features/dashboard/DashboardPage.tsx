import { ArrowRight, Banknote, Bell, CircleAlert, Coins, Receipt, Wallet } from "lucide-react";
import { useDashboardData } from "./useDashboardData";
import { formatDate, formatUsd, statusTone } from "../expenses/types";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { notificationCategoryLabel } from "../notifications/notifierHooks";

function KpiCard({ icon: Icon, label, value, sublabel, tone }: { icon: typeof Banknote; label: string; value: string; sublabel?: string; tone?: "good" | "warn" | "error" | "info" }) {
  return (
    <div className={["kpi-card", tone ? `kpi-${tone}` : ""].filter(Boolean).join(" ")}>
      <div className="kpi-icon"><Icon size={18} /></div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        {sublabel ? <span className="kpi-sublabel">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, isLoading, isFinance } = useDashboardData();
  const me = useCurrentUser();
  const { t } = useT();
  const name = userDisplayName(me.data?.data) || "there";

  return (
    <section className="dashboard">
      <PageHeader
        title={t("dashboard.title", `Welcome, ${name.split(" ")[0] || "there"}`)}
        subtitle={t("dashboard.subtitle", isFinance ? "Organization-wide snapshot" : "Your activity")}
        actions={
          <button className="primary-button" onClick={() => onNavigate("/expenses/new")}>
            <Receipt size={16} /> {t("dashboard.submitExpense", "Submit expense")}
          </button>
        }
      />

      <div className="kpi-grid">
        <KpiCard
          icon={Wallet}
          label={t("dashboard.totalExpenses", "Total expenses (month)")}
          value={isLoading ? "—" : formatUsd(data.totalExpensesThisMonth)}
          sublabel={isFinance ? "All departments" : "Your submissions"}
        />
        <KpiCard
          icon={Receipt}
          label={t("dashboard.pending", "Pending approvals")}
          value={isLoading ? "—" : String(data.pendingApprovals)}
          sublabel={isFinance ? "Waiting on you" : "Your submissions"}
          tone={data.pendingApprovals > 0 ? "warn" : undefined}
        />
        <KpiCard
          icon={CircleAlert}
          label={t("dashboard.budgetUsed", "Budget used")}
          value={isLoading ? "—" : `${data.averageBudgetUtilization}%`}
          sublabel="Across all departments"
          tone={data.averageBudgetUtilization >= 100 ? "error" : data.averageBudgetUtilization >= 80 ? "warn" : undefined}
        />
        <KpiCard
          icon={Coins}
          label={t("dashboard.reimbursements", "Reimbursements (month)")}
          value={isLoading ? "—" : formatUsd(data.reimbursementsThisMonth)}
          sublabel="Paid this month"
          tone="good"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title">
            <Receipt size={14} />
            <span>{t("dashboard.recent", "Recent expenses")}</span>
            <button type="button" className="link-button panel-link" onClick={() => onNavigate("/expenses")}>
              {t("common.viewAll", "View all")} <ArrowRight size={14} />
            </button>
          </div>
          {isLoading ? (
            <div className="panel-skeleton">
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line" />
            </div>
          ) : data.recentExpenses.length === 0 ? (
            <div className="panel-empty">No expenses yet.</div>
          ) : (
            <ul className="recent-list">
              {data.recentExpenses.map((expense) => (
                <li key={expense.itemId} className="recent-row" onClick={() => expense.itemId && onNavigate(`/expenses/${expense.itemId}`)}>
                  <div className="recent-row-head">
                    <strong>{expense.description}</strong>
                    <span className="recent-amount">{formatUsd(expense.amount)}</span>
                  </div>
                  <div className="recent-row-meta">
                    <span>{expense.submittedByName ?? expense.submittedByEmail ?? "—"}</span>
                    <span>·</span>
                    <span>{expense.departmentName}</span>
                    <span>·</span>
                    <span>{formatDate(expense.expenseDate)}</span>
                    <StatusPill tone={statusTone(expense.status)}>{expense.status ?? "—"}</StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <Wallet size={14} />
            <span>{t("dashboard.byDepartment", "Spending by department")}</span>
          </div>
          {isLoading ? (
            <div className="panel-skeleton">
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line" />
            </div>
          ) : data.spendingByDepartment.length === 0 ? (
            <div className="panel-empty">No spending recorded this month.</div>
          ) : (
            <ul className="bar-list">
              {data.spendingByDepartment.slice(0, 5).map((entry) => {
                const max = data.spendingByDepartment[0]?.amount || 1;
                const pct = Math.max(2, Math.round((entry.amount / max) * 100));
                return (
                  <li key={entry.departmentName} className="bar-row">
                    <span className="bar-label">{entry.departmentName}</span>
                    <span className="bar-track" aria-hidden="true">
                      <span className="bar-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="bar-value">{formatUsd(entry.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <Coins size={14} />
            <span>{t("dashboard.budgetUtil", "Budget utilization")}</span>
            <button type="button" className="link-button panel-link" onClick={() => onNavigate("/budgets")}>
              {t("common.viewAll", "View all")} <ArrowRight size={14} />
            </button>
          </div>
          {isLoading ? (
            <div className="panel-skeleton">
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line" />
            </div>
          ) : data.budgetUtilization.length === 0 ? (
            <div className="panel-empty">No budgets configured yet.</div>
          ) : (
            <ul className="util-list">
              {data.budgetUtilization.slice(0, 5).map((b) => (
                <li key={b.departmentId} className="util-row">
                  <div className="util-row-head">
                    <strong>{b.departmentName}</strong>
                    <StatusPill tone={b.status === "Blocked" ? "error" : b.status === "Warning" ? "warn" : "good"}>
                      {b.status}
                    </StatusPill>
                  </div>
                  <div className="util-row-track">
                    <span className="util-fill" style={{ width: `${Math.min(100, b.utilization)}%`, background: b.status === "Blocked" ? "hsl(var(--destructive))" : b.status === "Warning" ? "hsl(var(--warning))" : "hsl(var(--primary))" }} />
                  </div>
                  <div className="util-row-meta">
                    <span>{formatUsd(b.spent)} of {formatUsd(b.budget)}</span>
                    <span>{b.utilization}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <Bell size={14} />
            <span>{t("dashboard.budgetAlerts", "Budget warning alerts")}</span>
          </div>
          {isLoading ? (
            <div className="panel-skeleton"><Skeleton className="skeleton-line" /></div>
          ) : data.budgetWarningAlerts.length === 0 ? (
            <div className="panel-empty">All departments within budget.</div>
          ) : (
            <ul className="alert-list">
              {data.budgetWarningAlerts.map((alert) => (
                <li key={alert.departmentName} className={["alert-row", `alert-${alert.status.toLowerCase()}`].join(" ")}>
                  <CircleAlert size={16} />
                  <div>
                    <strong>{alert.departmentName}</strong>
                    <p>
                      {alert.status === "Blocked"
                        ? `${alert.departmentName} has reached its monthly budget. New expenses are currently blocked.`
                        : `${alert.departmentName} has used ${alert.utilization}% of its monthly budget.`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isFinance ? (
          <section className="panel">
            <div className="panel-title">
              <Banknote size={14} />
              <span>{t("dashboard.pendingActivity", "Pending approval activity")}</span>
              <button type="button" className="link-button panel-link" onClick={() => onNavigate("/expenses/pending")}>
                {t("common.viewAll", "View all")} <ArrowRight size={14} />
              </button>
            </div>
            {data.pendingApprovalActivity.length === 0 ? (
              <div className="panel-empty">Nothing waiting on you right now.</div>
            ) : (
              <ul className="recent-list">
                {data.pendingApprovalActivity.map((expense) => (
                  <li key={expense.itemId} className="recent-row" onClick={() => expense.itemId && onNavigate(`/expenses/${expense.itemId}`)}>
                    <div className="recent-row-head">
                      <strong>{expense.description}</strong>
                      <span className="recent-amount">{formatUsd(expense.amount)}</span>
                    </div>
                    <div className="recent-row-meta">
                      <span>{expense.submittedByName}</span>
                      <span>·</span>
                      <span>{expense.departmentName}</span>
                      <span>·</span>
                      <span>{expense.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-title">
            <Bell size={14} />
            <span>{t("dashboard.recentNotifications", "Recent notifications")}</span>
            <button type="button" className="link-button panel-link" onClick={() => onNavigate("/alerts")}>
              {t("common.viewAll", "View all")} <ArrowRight size={14} />
            </button>
          </div>
          {data.recentNotifications.length === 0 ? (
            <div className="panel-empty">No recent notifications.</div>
          ) : (
            <ul className="notification-list">
              {data.recentNotifications.map((n, index) => (
                <li key={n.itemId ?? index} className="notification-row">
                  <strong>{n.title ?? "Notification"}</strong>
                  {n.body ? <p>{n.body}</p> : null}
                  <span className="muted small">{notificationCategoryLabel(n.category)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
