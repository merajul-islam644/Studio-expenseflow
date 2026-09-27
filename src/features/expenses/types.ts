// Shared types for ExpenseFlow's data layer. The actual API calls live in
// their own `expensesApi.ts`, `budgetsApi.ts`, etc. — these types describe
// the runtime shape of one record, plus the small set of derived helpers
// (status enums, route calculation) used everywhere.
import type { BlocksUser } from "@seliseblocks/client";

export type ExpenseStatus =
  | "Draft"
  | "Submitted"
  | "Pending L1"
  | "Pending L2"
  | "Pending L3"
  | "Approved"
  | "Reimbursed"
  | "Rejected"
  | "Needs Revision"
  | "Blocked";

export const EXPENSE_STATUSES: ExpenseStatus[] = [
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

export type ApprovalLevel = 1 | 2 | 3;

export type Department = {
  itemId?: string;
  name?: string;
  region?: string;
  headcount?: number;
};

export type ExpenseCategory = {
  itemId?: string;
  name?: string;
  displayName?: string;
  sortOrder?: number;
};

export type RejectionReason = {
  itemId?: string;
  name?: string;
  displayName?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type ApprovalRule = {
  itemId?: string;
  label?: string;
  minAmount?: number;
  maxAmount?: number | null;
  level?: ApprovalLevel;
  sortOrder?: number;
};

export type Budget = {
  itemId?: string;
  departmentId?: string;
  departmentName?: string;
  period?: string;
  budgetAmount?: number;
  spentAmount?: number;
  periodStart?: string;
  periodEnd?: string;
};

export type ExpenseLineItem = {
  itemId?: string;
  expenseId?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  amount?: number;
  receiptFileId?: string;
  receiptFileName?: string;
  receiptFileUrl?: string;
  sortOrder?: number;
};

export type ExpenseApproval = {
  itemId?: string;
  expenseId?: string;
  level?: ApprovalLevel;
  approverUserId?: string;
  approverName?: string;
  decision?: "Approved" | "Rejected";
  comments?: string;
  decidedAt?: string;
};

export type Expense = {
  itemId?: string;
  expenseId?: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  categoryId?: string;
  categoryName?: string;
  expenseDate?: string;
  amount?: number;
  currency?: string;
  status?: ExpenseStatus;
  currentLevel?: ApprovalLevel | null;
  submittedByUserId?: string;
  submittedByName?: string;
  submittedByEmail?: string;
  approverL1UserId?: string;
  approverL1Name?: string;
  approverL2UserId?: string;
  approverL2Name?: string;
  approverL3UserId?: string;
  approverL3Name?: string;
  approvalRoute?: string;
  rejectionReasonId?: string;
  rejectionReasonName?: string;
  rejectionComments?: string;
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  resubmitCount?: number;
};

export type CurrentUserProfile = BlocksUser;

export const APPROVAL_LEVEL_LABEL: Record<ApprovalLevel, string> = {
  1: "Team Lead",
  2: "Department Manager",
  3: "Finance Director"
};

// The amount-based route rules. Mirrors the PRD's defaults:
//   $0      – $500     → level 1 only
//   $500.01 – $5,000   → levels 1 and 2
//   >$5,000             → levels 1, 2 and 3
// Stored in the ApprovalRule schema, but duplicated here so the route
// preview on the Submit Expense form can render before the rules have
// loaded from the gateway.
export const DEFAULT_ROUTE_RULES: Array<{ min: number; max: number | null; level: ApprovalLevel; sortOrder: number }> = [
  { min: 0, max: 500, level: 1, sortOrder: 1 },
  { min: 500.01, max: 5000, level: 2, sortOrder: 2 },
  { min: 5000.01, max: null, level: 3, sortOrder: 3 }
];

// Compute the list of required approval levels for a given total. Each rule
// adds its level to the route; existing expenses keep the route they were
// submitted with (their stored `approvalRoute` is the source of truth), but
// this is what the Submit Expense preview uses.
export function computeRoute(total: number, rules?: ApprovalRule[]): ApprovalLevel[] {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const list: Array<{ min: number; max: number | null; level: ApprovalLevel; sortOrder: number }> =
    rules && rules.length > 0
      ? rules.map((r) => ({
          min: r.minAmount ?? 0,
          max: r.maxAmount ?? null,
          level: (r.level ?? 1) as ApprovalLevel,
          sortOrder: r.sortOrder ?? 0
        }))
      : DEFAULT_ROUTE_RULES;
  const levels = new Set<ApprovalLevel>();
  list
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((rule) => {
      if (safeTotal >= rule.min && (rule.max === null || safeTotal <= rule.max)) {
        levels.add(rule.level);
      }
    });
  return Array.from(levels).sort((a, b) => a - b);
}

export function routeSummary(total: number, rules?: ApprovalRule[]): string {
  const levels = computeRoute(total, rules);
  if (levels.length === 0) return "No approval required";
  return levels.map((level) => APPROVAL_LEVEL_LABEL[level]).join(" → ");
}

export function formatUsd(value: number | undefined | null): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safe);
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function statusTone(status: ExpenseStatus | undefined): "good" | "warn" | "neutral" | "error" | "info" {
  switch (status) {
    case "Approved":
    case "Reimbursed":
      return "good";
    case "Pending L1":
    case "Pending L2":
    case "Pending L3":
    case "Submitted":
      return "warn";
    case "Rejected":
    case "Blocked":
      return "error";
    case "Needs Revision":
      return "info";
    case "Draft":
    default:
      return "neutral";
  }
}
