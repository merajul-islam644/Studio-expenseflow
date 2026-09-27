// Approval/rejection dialogs. Both submit through the SDK and the
// notifier so the submitter and approvers get a real notification when
// the decision lands.
import { useState } from "react";
import { Modal } from "../../shared/ui/Modal";
import { FormField } from "../../shared/ui/FormField";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { blocksClient } from "../../lib/blocks/client";
import {
  createApproval,
  getExpense,
  updateExpense
} from "./api";
import { notifyApprovalDecision, notifyApprovalRequired } from "../notifications/notify";
import { computeRoute, APPROVAL_LEVEL_LABEL, type ApprovalLevel, type Expense, type ExpenseStatus, type RejectionReason } from "./types";

function nextStatusAfterApproval(currentStatus: ExpenseStatus, currentLevel: ApprovalLevel | null | undefined): { status: ExpenseStatus; nextLevel: ApprovalLevel | null } {
  if (currentLevel === 1) return { status: "Pending L2", nextLevel: 2 };
  if (currentLevel === 2) return { status: "Pending L3", nextLevel: 3 };
  if (currentLevel === 3) return { status: "Approved", nextLevel: null };
  return { status: "Approved", nextLevel: null };
}

export function RejectExpenseModal({
  expense,
  reasons,
  onClose,
  onDecided
}: {
  expense: Expense;
  reasons: RejectionReason[];
  onClose: () => void;
  onDecided: () => void;
}) {
  const { t } = useT();
  const [reasonId, setReasonId] = useState("");
  const [comments, setComments] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const activeReasons = reasons.filter((r) => r.isActive !== false);
  const selectedReason = activeReasons.find((r) => r.itemId === reasonId);
  const isOther = selectedReason?.name === "other";
  const commentsRequired = isOther && comments.trim().length === 0;
  const canConfirm = reasonId && !commentsRequired;

  async function handleConfirm() {
    if (!canConfirm) return;
    setPending(true);
    setError(undefined);
    try {
      const itemId = expense.itemId;
      if (!itemId) throw new Error("Missing expense id.");
      const reason = activeReasons.find((r) => r.itemId === reasonId);
      const level = (expense.currentLevel ?? 1) as ApprovalLevel;
      await updateExpense(itemId, {
        status: "Rejected",
        currentLevel: null,
        rejectionReasonId: reason?.itemId,
        rejectionReasonName: reason?.displayName,
        rejectionComments: comments.trim() || undefined
      });
      await createApproval({
        expenseId: itemId,
        level,
        approverUserId: "current-user",
        approverName: undefined,
        decision: "Rejected",
        comments: comments.trim() || undefined,
        decidedAt: new Date().toISOString()
      });
      await notifyApprovalDecision(expense, "rejected", reason?.displayName, comments.trim());
      onDecided();
      onClose();
    } catch (caught) {
      setError((caught as Error).message || "Could not reject the expense.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={t("reject.title")} onClose={onClose}>
      <div className="form-field">
        <span>{t("reject.reason")}</span>
        <select value={reasonId} onChange={(event) => setReasonId(event.target.value)} required>
          <option value="">{t("reject.reasonPlaceholder")}</option>
          {activeReasons.map((reason) => (
            <option key={reason.itemId} value={reason.itemId}>{reason.displayName ?? reason.name}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <span>{t("reject.comments")}</span>
        <textarea
          maxLength={500}
          value={comments}
          onChange={(event) => setComments(event.target.value.slice(0, 500))}
          placeholder={isOther ? t("reject.commentsRequired") : t("reject.commentsHelp")}
        />
      </div>
      {error ? <p style={{ color: "hsl(var(--destructive))", fontSize: 13 }}>{error}</p> : null}
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose} disabled={pending}>{t("reject.cancel")}</button>
        <button className="danger-button" onClick={handleConfirm} disabled={!canConfirm || pending}>
          {pending ? t("common.loading") : t("reject.confirm")}
        </button>
      </div>
    </Modal>
  );
}

export function ApproveExpenseModal({
  expense,
  onClose,
  onDecided
}: {
  expense: Expense;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { t } = useT();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const currentLevel = (expense.currentLevel ?? 1) as ApprovalLevel;
  const { status: nextStatus, nextLevel } = nextStatusAfterApproval(expense.status as ExpenseStatus, currentLevel);
  const finalLevel = !nextLevel;
  const route = computeRoute(expense.amount ?? 0);

  async function handleConfirm() {
    setPending(true);
    setError(undefined);
    try {
      const itemId = expense.itemId;
      if (!itemId) throw new Error("Missing expense id.");
      await updateExpense(itemId, {
        status: nextStatus,
        currentLevel: nextLevel,
        approvedAt: finalLevel ? new Date().toISOString() : undefined
      });
      await createApproval({
        expenseId: itemId,
        level: currentLevel,
        approverUserId: "current-user",
        approverName: undefined,
        decision: "Approved",
        decidedAt: new Date().toISOString()
      });
      if (finalLevel) {
        await notifyApprovalDecision(expense, "approved_final");
      } else {
        // Notify next level's approver
        const nextLevelNumber = (nextLevel ?? 1) as ApprovalLevel;
        if (route.includes(nextLevelNumber)) {
          await notifyApprovalRequired(expense, nextLevelNumber);
        }
      }
      onDecided();
      onClose();
    } catch (caught) {
      setError((caught as Error).message || "Could not approve the expense.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={t("expenses.detail.approve")} onClose={onClose}>
      <p>
        {t("approve.confirm")} {finalLevel ? t("approve.finalLevel") : t("approve.nextLevel")}
      </p>
      <p style={{ marginTop: 4 }}>
        Next status: <strong>{nextStatus}</strong>
        {nextLevel ? <> · Level {nextLevel} — {APPROVAL_LEVEL_LABEL[nextLevel]}</> : null}
      </p>
      {error ? <p style={{ color: "hsl(var(--destructive))", fontSize: 13 }}>{error}</p> : null}
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose} disabled={pending}>{t("common.cancel")}</button>
        <button className="primary-button" onClick={handleConfirm} disabled={pending}>
          {pending ? t("common.loading") : t("expenses.detail.approve")}
        </button>
      </div>
    </Modal>
  );
}

export function MarkReimbursedModal({
  expense,
  onClose,
  onDecided
}: {
  expense: Expense;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { t } = useT();
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!expense.itemId) return;
    setPending(true);
    try {
      await updateExpense(expense.itemId, {
        status: "Reimbursed",
        paidAt: new Date().toISOString()
      });
      await notifyApprovalDecision(expense, "reimbursed");
      onDecided();
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={t("expenses.detail.markPaid")} onClose={onClose}>
      <p>This will mark the expense as reimbursed and notify the submitter.</p>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose} disabled={pending}>{t("common.cancel")}</button>
        <button className="primary-button" onClick={handleConfirm} disabled={pending}>
          {pending ? t("common.loading") : t("expenses.detail.markPaid")}
        </button>
      </div>
    </Modal>
  );
}

export async function refetchExpense(itemId: string): Promise<Expense | undefined> {
  return getExpense(itemId);
}

export { notifyApprovalRequired };
