// Notification helpers for the approval lifecycle. Each one is a thin
// wrapper around blocksClient.notifier.notify that fills in a stable
// payload shape so the Alerts page can render the same notification
// consistently regardless of which lifecycle event fired it.
import { blocksClient } from "../../lib/blocks/client";
import type { Expense, ApprovalLevel } from "../expenses/types";

function safeUserIds(...ids: Array<string | undefined | null>): string[] {
  return ids.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function encodePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

export async function notifyApprovalRequired(expense: Expense, level: ApprovalLevel): Promise<void> {
  try {
    await blocksClient.notifier.notify({
      userIds: safeUserIds(expense.submittedByUserId),
      denormalizedPayload: encodePayload({
        category: "approval_required",
        title: "Approval required",
        body: `${expense.submittedByName ?? "An employee"} submitted "${expense.description}" — awaiting your level-${level} approval.`,
        expenseId: expense.itemId,
        amount: expense.amount
      }),
      saveDenormalizedPayloadAsAnObject: true
    });
  } catch {
    // Notifier failures are non-fatal for the underlying approval flow.
  }
}

export async function notifyExpenseSubmitted(expense: Expense): Promise<void> {
  try {
    await blocksClient.notifier.notify({
      userIds: safeUserIds(expense.submittedByUserId),
      denormalizedPayload: encodePayload({
        category: "expense_submitted",
        title: "Expense submitted",
        body: `Your expense "${expense.description}" was submitted for approval.`,
        expenseId: expense.itemId,
        amount: expense.amount
      }),
      saveDenormalizedPayloadAsAnObject: true
    });
  } catch {
    // Notifier failures are non-fatal.
  }
}

export async function notifyApprovalDecision(
  expense: Expense,
  decision: "approved" | "approved_final" | "rejected" | "reimbursed",
  rejectionReasonName?: string,
  rejectionComments?: string
): Promise<void> {
  const titles: Record<typeof decision, string> = {
    approved: "Expense approved",
    approved_final: "Expense approved",
    rejected: "Expense rejected",
    reimbursed: "Reimbursement processed"
  };
  const bodies: Record<typeof decision, string> = {
    approved: `Your expense "${expense.description}" was approved at the current level.`,
    approved_final: `Your expense "${expense.description}" has been fully approved and is ready for reimbursement.`,
    rejected: `Your expense "${expense.description}" was rejected${rejectionReasonName ? ` — ${rejectionReasonName}` : ""}.${rejectionComments ? ` ${rejectionComments}` : ""}`,
    reimbursed: `Your expense "${expense.description}" has been reimbursed.`
  };
  try {
    await blocksClient.notifier.notify({
      userIds: safeUserIds(expense.submittedByUserId),
      denormalizedPayload: encodePayload({
        category: decision === "rejected" ? "expense_rejected" : decision === "reimbursed" ? "reimbursement_processed" : "expense_approved",
        title: titles[decision],
        body: bodies[decision],
        expenseId: expense.itemId,
        amount: expense.amount
      }),
      saveDenormalizedPayloadAsAnObject: true
    });
  } catch {
    // Notifier failures are non-fatal.
  }
}

export async function notifyBudgetAlert(departmentName: string, status: "warning" | "blocked", utilization: number): Promise<void> {
  try {
    await blocksClient.notifier.notify({
      denormalizedPayload: encodePayload({
        category: status === "blocked" ? "budget_blocked" : "budget_warning",
        title: status === "blocked" ? "Budget reached" : "Budget warning",
        body: status === "blocked"
          ? `${departmentName} has reached its monthly budget. New expenses are currently blocked.`
          : `${departmentName} has used ${utilization}% of its monthly budget.`,
        departmentName,
        utilization
      }),
      saveDenormalizedPayloadAsAnObject: true
    });
  } catch {
    // Notifier failures are non-fatal.
  }
}

