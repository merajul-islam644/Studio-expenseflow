// Shared Blocks Data CRUD helpers for ExpenseFlow. Each helper uses the
// app-wide `blocksClient.data.collection` helper with the right schema
// name and field selection so the GraphQL responses are tight and the
// runtime can cache them through TanStack Query.
import { blocksClient } from "../../lib/blocks/client";
import type {
  ApprovalRule,
  Budget,
  Department,
  Expense,
  ExpenseApproval,
  ExpenseCategory,
  ExpenseLineItem,
  RejectionReason
} from "./types";

function normalizeList<T extends Record<string, unknown>>(response: unknown): { items: T[]; totalCount: number } {
  const record = response as {
    data?: { items?: T[]; totalCount?: number };
    items?: T[];
    totalCount?: number;
  } | undefined;
  const data = record?.data ?? (record as { items?: T[]; totalCount?: number });
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? items.length;
  return { items: items as T[], totalCount: Number.isFinite(totalCount) ? totalCount : items.length };
}

const departmentFields = [
  "ItemId",
  "name",
  "region",
  "headcount"
];

const expenseCategoryFields = [
  "ItemId",
  "name",
  "displayName",
  "sortOrder"
];

const rejectionReasonFields = [
  "ItemId",
  "name",
  "displayName",
  "sortOrder",
  "isActive"
];

const approvalRuleFields = [
  "ItemId",
  "label",
  "minAmount",
  "maxAmount",
  "level",
  "sortOrder"
];

const budgetFields = [
  "ItemId",
  "departmentId",
  "departmentName",
  "period",
  "budgetAmount",
  "spentAmount",
  "periodStart",
  "periodEnd"
];

const expenseFields = [
  "ItemId",
  "expenseId",
  "description",
  "departmentId",
  "departmentName",
  "categoryId",
  "categoryName",
  "expenseDate",
  "amount",
  "currency",
  "status",
  "currentLevel",
  "submittedByUserId",
  "submittedByName",
  "submittedByEmail",
  "approverL1UserId",
  "approverL1Name",
  "approverL2UserId",
  "approverL2Name",
  "approverL3UserId",
  "approverL3Name",
  "approvalRoute",
  "rejectionReasonId",
  "rejectionReasonName",
  "rejectionComments",
  "submittedAt",
  "approvedAt",
  "paidAt",
  "resubmitCount"
];

const expenseLineItemFields = [
  "ItemId",
  "expenseId",
  "description",
  "categoryId",
  "categoryName",
  "amount",
  "receiptFileId",
  "receiptFileName",
  "receiptFileUrl",
  "sortOrder"
];

const expenseApprovalFields = [
  "ItemId",
  "expenseId",
  "level",
  "approverUserId",
  "approverName",
  "decision",
  "comments",
  "decidedAt"
];

// Departments
const departmentsCollection = blocksClient.data.collection<Department>("Department", { fields: departmentFields });

export async function listDepartments(): Promise<Department[]> {
  const response = await departmentsCollection.list({ pageSize: 100 });
  return normalizeList<Department>(response).items;
}

export async function getDepartment(itemId: string): Promise<Department | undefined> {
  const response = await departmentsCollection.get(itemId);
  return (response as { data?: Department } | undefined)?.data;
}

export async function createDepartment(payload: Partial<Department>): Promise<unknown> {
  return departmentsCollection.create(payload);
}

export async function updateDepartment(itemId: string, payload: Partial<Department>): Promise<unknown> {
  return departmentsCollection.update(itemId, payload);
}

// Expense Categories
const categoriesCollection = blocksClient.data.collection<ExpenseCategory>("ExpenseCategory", { fields: expenseCategoryFields });

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const response = await categoriesCollection.list({ pageSize: 100 });
  return normalizeList<ExpenseCategory>(response).items;
}

export async function createExpenseCategory(payload: Partial<ExpenseCategory>): Promise<unknown> {
  return categoriesCollection.create(payload);
}

export async function updateExpenseCategory(itemId: string, payload: Partial<ExpenseCategory>): Promise<unknown> {
  return categoriesCollection.update(itemId, payload);
}

export async function deleteExpenseCategory(itemId: string): Promise<unknown> {
  return categoriesCollection.delete(itemId);
}

// Rejection Reasons
const reasonsCollection = blocksClient.data.collection<RejectionReason>("RejectionReason", { fields: rejectionReasonFields });

export async function listRejectionReasons(): Promise<RejectionReason[]> {
  const response = await reasonsCollection.list({ pageSize: 100 });
  return normalizeList<RejectionReason>(response).items;
}

export async function createRejectionReason(payload: Partial<RejectionReason>): Promise<unknown> {
  return reasonsCollection.create(payload);
}

export async function updateRejectionReason(itemId: string, payload: Partial<RejectionReason>): Promise<unknown> {
  return reasonsCollection.update(itemId, payload);
}

export async function deleteRejectionReason(itemId: string): Promise<unknown> {
  return reasonsCollection.delete(itemId);
}

// Approval Rules
const rulesCollection = blocksClient.data.collection<ApprovalRule>("ApprovalRule", { fields: approvalRuleFields });

export async function listApprovalRules(): Promise<ApprovalRule[]> {
  const response = await rulesCollection.list({ pageSize: 100 });
  return normalizeList<ApprovalRule>(response).items;
}

export async function createApprovalRule(payload: Partial<ApprovalRule>): Promise<unknown> {
  return rulesCollection.create(payload);
}

export async function updateApprovalRule(itemId: string, payload: Partial<ApprovalRule>): Promise<unknown> {
  return rulesCollection.update(itemId, payload);
}

export async function deleteApprovalRule(itemId: string): Promise<unknown> {
  return rulesCollection.delete(itemId);
}

// Budgets
const budgetsCollection = blocksClient.data.collection<Budget>("Budget", { fields: budgetFields });

export async function listBudgets(): Promise<Budget[]> {
  const response = await budgetsCollection.list({ pageSize: 100 });
  return normalizeList<Budget>(response).items;
}

export async function createBudget(payload: Partial<Budget>): Promise<unknown> {
  return budgetsCollection.create(payload);
}

export async function updateBudget(itemId: string, payload: Partial<Budget>): Promise<unknown> {
  return budgetsCollection.update(itemId, payload);
}

// Expenses
const expensesCollection = blocksClient.data.collection<Expense>("Expense", { fields: expenseFields });

export type ExpenseListParams = {
  filter?: Record<string, unknown>;
  pageNo?: number;
  pageSize?: number;
  search?: string;
  sort?: Record<string, number>;
};

export async function listExpenses(params: ExpenseListParams = {}): Promise<{ items: Expense[]; totalCount: number }> {
  const response = await expensesCollection.list({
    filter: params.filter,
    pageNo: params.pageNo ?? 1,
    pageSize: params.pageSize ?? 50,
    sort: params.sort
  });
  return normalizeList<Expense>(response);
}

export async function getExpense(itemId: string): Promise<Expense | undefined> {
  const response = await expensesCollection.get(itemId);
  const data = (response as { data?: Expense } | undefined)?.data;
  return data;
}

export async function createExpense(payload: Partial<Expense>): Promise<unknown> {
  return expensesCollection.create(payload);
}

export async function updateExpense(itemId: string, payload: Partial<Expense>): Promise<unknown> {
  return expensesCollection.update(itemId, payload);
}

export async function deleteExpense(itemId: string): Promise<unknown> {
  return expensesCollection.delete(itemId);
}

// Expense Line Items
const lineItemsCollection = blocksClient.data.collection<ExpenseLineItem>("ExpenseLineItem", { fields: expenseLineItemFields });

export async function listLineItems(expenseId: string): Promise<ExpenseLineItem[]> {
  const response = await lineItemsCollection.list({
    filter: { expenseId },
    pageSize: 100
  });
  return normalizeList<ExpenseLineItem>(response).items;
}

export async function createLineItem(payload: Partial<ExpenseLineItem>): Promise<unknown> {
  return lineItemsCollection.create(payload);
}

export async function updateLineItem(itemId: string, payload: Partial<ExpenseLineItem>): Promise<unknown> {
  return lineItemsCollection.update(itemId, payload);
}

export async function deleteLineItem(itemId: string): Promise<unknown> {
  return lineItemsCollection.delete(itemId);
}

export async function bulkCreateLineItems(items: Array<Partial<ExpenseLineItem>>): Promise<unknown> {
  // The collection helper has no insertMany; line items are typically
  // a handful, so a Promise.all of create calls keeps the API surface
  // tight while still being parallel.
  return Promise.all(items.map((item) => lineItemsCollection.create(item)));
}

// Expense Approvals (audit trail)
const approvalsCollection = blocksClient.data.collection<ExpenseApproval>("ExpenseApproval", { fields: expenseApprovalFields });

export async function listApprovals(expenseId: string): Promise<ExpenseApproval[]> {
  const response = await approvalsCollection.list({
    filter: { expenseId },
    pageSize: 50
  });
  return normalizeList<ExpenseApproval>(response).items;
}

export async function createApproval(payload: Partial<ExpenseApproval>): Promise<unknown> {
  return approvalsCollection.create(payload);
}
