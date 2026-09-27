// Pulls the signed-in user's own profile + the project's expenses/departments
// and exposes the small derived KPIs the Dashboard renders: total expenses
// (current month), pending approvals, budget utilization, and reimbursements.
// Heavy lifting (filtering, summing) is local; the gateway returns the raw
// paged lists.
import { useQueries, useQuery } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";
import {
  listBudgets,
  listDepartments,
  listExpenses
} from "../expenses/api";
import {
  type Budget,
  type Department,
  type Expense
} from "../expenses/types";
import { useCurrentUser } from "../profile/useCurrentUser";

function startOfMonth(): Date {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function withinCurrentMonth(value: string | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= startOfMonth();
}

export type DashboardData = {
  totalExpensesThisMonth: number;
  pendingApprovals: number;
  averageBudgetUtilization: number;
  reimbursementsThisMonth: number;
  recentExpenses: Expense[];
  spendingByDepartment: Array<{ departmentName: string; amount: number }>;
  budgetUtilization: Array<{ departmentId: string; departmentName: string; status: "Normal" | "Warning" | "Blocked"; utilization: number; spent: number; budget: number }>;
  pendingApprovalActivity: Expense[];
  budgetWarningAlerts: Array<{ departmentName: string; status: "Warning" | "Blocked"; utilization: number }>;
  recentNotifications: Array<{ itemId?: string; title?: string; body?: string; category?: string }>;
};

export function useDashboardData() {
  const me = useCurrentUser();
  const userId = me.data?.data?.itemId;
  const userRoles = me.data?.data?.roles ?? [];
  const isFinance = userRoles.some((role) =>
    ["expense-finance-director", "expense-finance-analyst", "expense-system-admin"].includes(role)
  );

  const deps = useQueries({
    queries: [
      { queryKey: ["dashboard", "expenses"], queryFn: () => listExpenses({ pageSize: 200 }), staleTime: 30_000 },
      { queryKey: ["dashboard", "departments"], queryFn: () => listDepartments(), staleTime: 5 * 60_000 },
      { queryKey: ["dashboard", "budgets"], queryFn: () => listBudgets(), staleTime: 30_000 }
    ]
  });

  const [expensesResult, departmentsResult, budgetsResult] = deps;
  const expenses: Expense[] = expensesResult.data?.items ?? [];
  const departments: Department[] = departmentsResult.data ?? [];
  const budgets: Budget[] = budgetsResult.data ?? [];

  const userScoped = isFinance ? expenses : expenses.filter((e) => e.submittedByUserId === userId);

  const monthExpenses = userScoped.filter((e) => withinCurrentMonth(e.submittedAt ?? e.expenseDate));
  const totalExpensesThisMonth = monthExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  // Pending approvals: own expenses that are waiting on someone, OR
  // expenses where the current user is the assigned approver.
  const ownPending = expenses.filter((e) =>
    e.submittedByUserId === userId && ["Pending L1", "Pending L2", "Pending L3", "Submitted"].includes(e.status ?? "")
  );
  const isApprover = userRoles.some((role) =>
    ["expense-team-lead", "expense-dept-manager", "expense-finance-director", "expense-system-admin"].includes(role)
  );
  const waitingOnMe = isApprover
    ? expenses.filter((e) => {
        if (e.submittedByUserId === userId) return false;
        if (e.status === "Pending L1" && userRoles.includes("expense-team-lead")) return true;
        if (e.status === "Pending L2" && userRoles.includes("expense-dept-manager")) return true;
        if (e.status === "Pending L3" && userRoles.includes("expense-finance-director")) return true;
        return false;
      })
    : [];
  const pendingApprovals = isApprover ? waitingOnMe.length : ownPending.length;

  const reimbursementsThisMonth = monthExpenses
    .filter((e) => e.status === "Reimbursed")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  // Budget utilization
  const budgetUtilization = budgets.map((b) => {
    const spent = b.spentAmount ?? 0;
    const budget = b.budgetAmount ?? 0;
    const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    let status: "Normal" | "Warning" | "Blocked" = "Normal";
    if (utilization >= 100) status = "Blocked";
    else if (utilization >= 80) status = "Warning";
    return {
      departmentId: b.departmentId ?? "",
      departmentName: b.departmentName ?? "Unknown",
      status,
      utilization,
      spent,
      budget
    };
  });

  const averageBudgetUtilization = budgetUtilization.length === 0
    ? 0
    : Math.round(budgetUtilization.reduce((sum, b) => sum + b.utilization, 0) / budgetUtilization.length);

  // Spending by department (current month)
  const byDept = new Map<string, number>();
  for (const e of monthExpenses) {
    const key = e.departmentName ?? "Other";
    byDept.set(key, (byDept.get(key) ?? 0) + (e.amount ?? 0));
  }
  const spendingByDepartment = Array.from(byDept.entries())
    .map(([departmentName, amount]) => ({ departmentName, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Recent expenses (own or org depending on role)
  const recentExpenses = userScoped
    .slice()
    .sort((a, b) => (b.submittedAt ?? b.expenseDate ?? "").localeCompare(a.submittedAt ?? a.expenseDate ?? ""))
    .slice(0, 5);

  const pendingApprovalActivity = isApprover ? waitingOnMe.slice(0, 5) : [];

  const budgetWarningAlerts = budgetUtilization
    .filter((b) => b.status !== "Normal")
    .map((b) => ({ departmentName: b.departmentName, status: b.status as "Warning" | "Blocked", utilization: b.utilization }));

  // Recent notifications — small client-side fetch; the Alerts page uses the
  // same data but paginated.
  const notificationsQuery = useQuery({
    queryKey: ["dashboard", "notifications"],
    queryFn: async () => {
      const response = await blocksClient.notifier.getNotifications({ pageSize: 5 });
      const record = response as {
        notifications?: Array<Record<string, unknown>>;
        data?: { notifications?: Array<Record<string, unknown>> };
      };
      const items = (record?.notifications ?? record?.data?.notifications ?? []) as Array<Record<string, unknown>>;
      return items.map((raw) => {
        let title: string | undefined;
        let body: string | undefined;
        let category: string | undefined;
        const payload = raw.denormalizedPayload ?? raw.payload;
        if (typeof payload === "string") {
          try {
            const parsed = JSON.parse(payload);
            if (parsed && typeof parsed === "object") {
              const obj = parsed as Record<string, unknown>;
              title = typeof obj.title === "string" ? obj.title : undefined;
              body = typeof obj.body === "string" ? obj.body : undefined;
              category = typeof obj.category === "string" ? obj.category : undefined;
            }
          } catch {
            // ignore
          }
        }
        return {
          itemId: typeof raw.id === "string" ? raw.id : undefined,
          title,
          body,
          category
        };
      });
    },
    staleTime: 30_000
  });

  return {
    data: {
      totalExpensesThisMonth,
      pendingApprovals,
      averageBudgetUtilization,
      reimbursementsThisMonth,
      recentExpenses,
      spendingByDepartment,
      budgetUtilization,
      pendingApprovalActivity,
      budgetWarningAlerts,
      recentNotifications: notificationsQuery.data ?? []
    } satisfies DashboardData,
    departments,
    budgets,
    isLoading: expensesResult.isLoading || departmentsResult.isLoading || budgetsResult.isLoading,
    isFinance,
    me
  };
}
