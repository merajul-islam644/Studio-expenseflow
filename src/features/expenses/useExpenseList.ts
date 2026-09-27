// Shared hook for the Expenses list: paged + filtered + sorted reads
// against the Expense schema. Returns the raw items plus a small set of
// derived helpers (filter/sort/search state) so the All Expenses, My
// Expenses, and Pending Approvals screens can share the same query.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "./api";
import type { Expense, ExpenseStatus } from "./types";
import { useCurrentUser } from "../profile/useCurrentUser";
import { userCanApproveLevel } from "../auth/permissions";

export type ExpenseTab = "all" | "mine" | "pending" | "approved" | "rejected";

export function useExpenseList(tab: ExpenseTab, page: number, pageSize: number) {
  const me = useCurrentUser();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<"submittedAt" | "amount" | "expenseDate">("submittedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const query = useQuery({
    queryFn: () => listExpenses({ pageNo: 1, pageSize: 500 }),
    queryKey: ["expenses", "list"]
  });

  const all = (query.data?.items ?? []) as Expense[];

  const userId = me.data?.data?.itemId;
  const userRoles = me.data?.data?.roles ?? [];

  const filtered = useMemo(() => {
    let items = all;

    if (tab === "mine") {
      items = items.filter((e) => e.submittedByUserId === userId);
    } else if (tab === "pending") {
      items = items.filter((e) => {
        if (e.submittedByUserId === userId) return false; // self-approval block
        if (e.status === "Pending L1" && userCanApproveLevel(me.data?.data, 1)) return true;
        if (e.status === "Pending L2" && userCanApproveLevel(me.data?.data, 2)) return true;
        if (e.status === "Pending L3" && userCanApproveLevel(me.data?.data, 3)) return true;
        if (e.status === "Submitted" && userCanApproveLevel(me.data?.data, 1)) return true;
        return false;
      });
    } else if (tab === "approved") {
      items = items.filter((e) => e.status === "Approved" || e.status === "Reimbursed");
    } else if (tab === "rejected") {
      items = items.filter((e) => e.status === "Rejected" || e.status === "Needs Revision");
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((e) =>
        (e.description ?? "").toLowerCase().includes(q)
        || (e.submittedByName ?? "").toLowerCase().includes(q)
        || (e.submittedByEmail ?? "").toLowerCase().includes(q)
        || (e.categoryName ?? "").toLowerCase().includes(q)
        || (e.expenseId ?? "").toLowerCase().includes(q)
      );
    }
    if (departmentId) items = items.filter((e) => e.departmentId === departmentId);
    if (categoryId) items = items.filter((e) => e.categoryId === categoryId);
    if (statusFilter) items = items.filter((e) => e.status === statusFilter);
    if (amountMin) items = items.filter((e) => (e.amount ?? 0) >= parseFloat(amountMin));
    if (amountMax) items = items.filter((e) => (e.amount ?? 0) <= parseFloat(amountMax));
    if (dateFrom) items = items.filter((e) => (e.expenseDate ?? "") >= dateFrom);
    if (dateTo) items = items.filter((e) => (e.expenseDate ?? "") <= dateTo + "T23:59:59");

    items = items.slice().sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (sortDir === "asc") return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });

    return items;
  }, [all, tab, userId, userRoles, me.data?.data, search, departmentId, categoryId, statusFilter, amountMin, amountMax, dateFrom, dateTo, sortField, sortDir]);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  function reset() {
    setSearch("");
    setDepartmentId("");
    setCategoryId("");
    setStatusFilter("");
    setAmountMin("");
    setAmountMax("");
    setDateFrom("");
    setDateTo("");
  }

  return {
    items: paged,
    total,
    totalAll: all.length,
    isLoading: query.isLoading,
    error: query.error,
    filters: {
      search, setSearch,
      departmentId, setDepartmentId,
      categoryId, setCategoryId,
      status: statusFilter, setStatus: setStatusFilter,
      amountMin, setAmountMin,
      amountMax, setAmountMax,
      dateFrom, setDateFrom,
      dateTo, setDateTo,
      sortField, setSortField,
      sortDir, setSortDir
    },
    reset
  };
}

export const ALL_TABS: Array<{ key: ExpenseTab; labelKey: string }> = [
  { key: "all", labelKey: "expenses.tabs.all" },
  { key: "mine", labelKey: "expenses.tabs.mine" },
  { key: "pending", labelKey: "expenses.tabs.pending" },
  { key: "approved", labelKey: "expenses.tabs.approved" },
  { key: "rejected", labelKey: "expenses.tabs.rejected" }
];

export const STATUS_OPTIONS: ExpenseStatus[] = [
  "Draft",
  "Submitted",
  "Pending L1",
  "Pending L2",
  "Pending L3",
  "Approved",
  "Reimbursed",
  "Rejected",
  "Needs Revision",
  "Blocked"
];

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
