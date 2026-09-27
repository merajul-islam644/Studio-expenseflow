import { useEffect, useState } from "react";
import { ArrowLeft, Check, Download, Eye, Receipt, X } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { StatusPill } from "../../shared/ui/StatusPill";
import {
  ApproveExpenseModal,
  MarkReimbursedModal,
  RejectExpenseModal
} from "./ApprovalActions";
import {
  listApprovals,
  listLineItems,
  listRejectionReasons,
  updateExpense,
  getExpense
} from "./api";
import {
  APPROVAL_LEVEL_LABEL,
  computeRoute,
  formatDate,
  formatUsd,
  statusTone,
  type ApprovalLevel,
  type Expense,
  type ExpenseApproval,
  type ExpenseLineItem,
  type RejectionReason
} from "./types";
import { useCurrentUser } from "../profile/useCurrentUser";
import { userCanApproveLevel, userHasPermission, userIsFinance } from "../auth/permissions";
import { notifyExpenseSubmitted } from "../notifications/notify";

export function ExpenseDetailsPage({ expenseId, onNavigate }: { expenseId: string; onNavigate: (path: string) => void }) {
  const { t } = useT();
  const me = useCurrentUser();
  const [expense, setExpense] = useState<Expense | undefined>();
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([]);
  const [approvals, setApprovals] = useState<ExpenseApproval[]>([]);
  const [reasons, setReasons] = useState<RejectionReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reimburseOpen, setReimburseOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await getExpense(expenseId);
      setExpense(result);
      if (result) {
        const [items, audit, reasonList] = await Promise.all([
          listLineItems(result.itemId ?? expenseId),
          listApprovals(result.itemId ?? expenseId),
          listRejectionReasons()
        ]);
        setLineItems(items);
        setApprovals(audit);
        setReasons(reasonList);
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!expenseId) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  if (loading) {
    return (
      <section>
        <PageHeader title={t("expenses.detail.title")} subtitle={t("expenses.detail.subtitle")} />
        <div className="section-card">
          <Skeleton className="skeleton-line-lg" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
        </div>
      </section>
    );
  }

  if (error || !expense) {
    return (
      <section>
        <PageHeader title={t("expenses.detail.title")} subtitle={t("expenses.detail.subtitle")} />
        <ErrorState message={error ?? "Expense not found"} onRetry={() => void loadAll()} />
      </section>
    );
  }

  const userId = me.data?.data?.itemId;
  const isSubmitter = expense.submittedByUserId === userId;
  const currentLevel = expense.currentLevel as ApprovalLevel | null | undefined;
  const userCanActOnThis = !!currentLevel && userCanApproveLevel(me.data?.data, currentLevel) && !isSubmitter;
  const route = computeRoute(expense.amount ?? 0);
  const isFinance = userIsFinance(me.data?.data);
  const isApproved = expense.status === "Approved";
  const canReimburse = isApproved && (isFinance || userHasPermission(me.data?.data, "manageOrg"));

  return (
    <section>
      <PageHeader
        title={t("expenses.detail.title")}
        subtitle={`${expense.expenseId ?? ""} · ${expense.description ?? ""}`}
        actions={
          <div className="form-actions">
            <button className="secondary-button" onClick={() => onNavigate("/expenses")}>
              <ArrowLeft size={16} /> {t("common.back")}
            </button>
            {!userCanActOnThis && isSubmitter && (expense.status === "Pending L1" || expense.status === "Pending L2" || expense.status === "Pending L3") ? (
              <span className="muted small" style={{ alignSelf: "center" }}>{t("expenses.detail.selfApprovalBlock")}</span>
            ) : null}
            {userCanActOnThis ? (
              <>
                <button className="danger-button" onClick={() => setRejectOpen(true)}>
                  <X size={16} /> {t("expenses.detail.reject")}
                </button>
                <button className="primary-button" onClick={() => setApproveOpen(true)}>
                  <Check size={16} /> {t("expenses.detail.approve")}
                </button>
              </>
            ) : null}
            {canReimburse ? (
              <button className="primary-button" onClick={() => setReimburseOpen(true)}>
                {t("expenses.detail.markPaid")}
              </button>
            ) : null}
            {expense.status === "Rejected" && isSubmitter ? (
              <button className="primary-button" onClick={async () => {
                if (!expense.itemId) return;
                await updateExpense(expense.itemId, {
                  status: "Needs Revision",
                  rejectionComments: undefined,
                  resubmitCount: (expense.resubmitCount ?? 0) + 1
                });
                await notifyExpenseSubmitted(expense);
                await loadAll();
              }}>
                {t("expenses.detail.resubmit")}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="detail-grid">
        <div style={{ display: "grid", gap: 14 }}>
          {expense.status === "Rejected" || expense.status === "Needs Revision" ? (
            <div className="section-card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><X size={14} /> {t("expenses.detail.rejectionReason")}</h3>
              <p><strong>{expense.rejectionReasonName ?? "—"}</strong></p>
              {expense.rejectionComments ? (
                <p style={{ color: "hsl(var(--muted-foreground))" }}>{expense.rejectionComments}</p>
              ) : null}
            </div>
          ) : null}

          <div className="section-card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Receipt size={14} /> {t("expenses.detail.lineItems")}</h3>
            {lineItems.length === 0 ? (
              <p className="muted">No line items.</p>
            ) : (
              <div className="line-items">
                {lineItems.map((li) => (
                  <div key={li.itemId} className="line-item">
                    <div className="line-item-row">
                      <div>
                        <div className="line-item-desc">{li.description}</div>
                        <div className="line-item-meta">{li.categoryName ?? "—"}</div>
                        {li.receiptFileId ? (
                          <div className="receipt-chip has-receipt">
                            <Receipt size={12} />
                            <a href={li.receiptFileUrl ?? "#"} target="_blank" rel="noopener noreferrer">{li.receiptFileName ?? "Receipt"}</a>
                            {li.receiptFileUrl ? (
                              <a href={li.receiptFileUrl} download={li.receiptFileName ?? "receipt"} aria-label="Download receipt">
                                <Download size={12} />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <div className="receipt-chip">No receipt</div>
                        )}
                      </div>
                      <span className="line-item-amount">{formatUsd(li.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid hsl(var(--border))", paddingTop: 12, marginTop: 12 }}>
              <div style={{ textAlign: "right" }}>
                <span className="kpi-label">{t("expenses.detail.total")}</span>
                <strong className="kpi-value" style={{ display: "block", fontSize: 22 }}>{formatUsd(expense.amount)}</strong>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Eye size={14} /> {t("expenses.detail.timeline")}</h3>
            <div className="timeline">
              {route.map((level) => {
                const auditEntry = approvals.find((a) => a.level === level);
                const status = expense.status;
                let display: "approved" | "rejected" | "waiting" | "pending" = "pending";
                let title = `${APPROVAL_LEVEL_LABEL[level]} — Pending`;
                let meta = `Level ${level} · ${APPROVAL_LEVEL_LABEL[level]}`;
                if (auditEntry?.decision === "Approved") {
                  display = "approved";
                  title = `${APPROVAL_LEVEL_LABEL[level]} approved`;
                  meta = auditEntry.decidedAt ?? "";
                } else if (auditEntry?.decision === "Rejected") {
                  display = "rejected";
                  title = `${APPROVAL_LEVEL_LABEL[level]} rejected`;
                  meta = auditEntry.decidedAt ?? "";
                } else if (status === `Pending L${level}` || (status === "Submitted" && level === 1)) {
                  display = "waiting";
                  title = `${APPROVAL_LEVEL_LABEL[level]} — Waiting`;
                  meta = `Awaiting decision`;
                }
                return (
                  <div key={level} className={["timeline-step", display].join(" ")}>
                    <span className="timeline-icon">
                      {display === "approved" ? <Check size={16} /> : display === "rejected" ? <X size={16} /> : display === "waiting" ? <Eye size={16} /> : <Receipt size={16} />}
                    </span>
                    <div className="timeline-body">
                      <span className="timeline-title">{title}</span>
                      <span className="timeline-meta">{meta}{auditEntry?.approverName ? ` · ${auditEntry.approverName}` : ""}</span>
                    </div>
                  </div>
                );
              })}
              {expense.status === "Approved" || expense.status === "Reimbursed" ? (
                <div className="timeline-step approved">
                  <span className="timeline-icon"><Check size={16} /></span>
                  <div className="timeline-body">
                    <span className="timeline-title">{expense.status === "Reimbursed" ? "Reimbursed" : "Approved"}</span>
                    <span className="timeline-meta">
                      {expense.status === "Reimbursed"
                        ? expense.paidAt ?? ""
                        : expense.approvedAt ?? ""}
                    </span>
                  </div>
                </div>
              ) : null}
              {expense.status === "Blocked" ? (
                <div className="timeline-step rejected">
                  <span className="timeline-icon"><X size={16} /></span>
                  <div className="timeline-body">
                    <span className="timeline-title">Submission blocked</span>
                    <span className="timeline-meta">Department budget reached 100%</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: 14 }}>
          <div className="detail-section">
            <h3>Summary</h3>
            <div className="detail-row"><span>Status</span><span><StatusPill tone={statusTone(expense.status)}>{expense.status ?? "—"}</StatusPill></span></div>
            <div className="detail-row"><span>Submitted by</span><span>{expense.submittedByName ?? expense.submittedByEmail ?? "—"}</span></div>
            <div className="detail-row"><span>Department</span><span>{expense.departmentName ?? "—"}</span></div>
            <div className="detail-row"><span>Category</span><span>{expense.categoryName ?? "—"}</span></div>
            <div className="detail-row"><span>Expense date</span><span>{formatDate(expense.expenseDate)}</span></div>
            <div className="detail-row"><span>Submitted at</span><span>{formatDate(expense.submittedAt)}</span></div>
            <div className="detail-row"><span>Approval route</span><span>{expense.approvalRoute ?? "—"}</span></div>
            {expense.resubmitCount && expense.resubmitCount > 0 ? (
              <div className="detail-row"><span>Resubmissions</span><span>{expense.resubmitCount}</span></div>
            ) : null}
          </div>
        </aside>
      </div>

      {approveOpen ? (
        <ApproveExpenseModal
          expense={expense}
          onClose={() => setApproveOpen(false)}
          onDecided={() => void loadAll()}
        />
      ) : null}
      {rejectOpen ? (
        <RejectExpenseModal
          expense={expense}
          reasons={reasons}
          onClose={() => setRejectOpen(false)}
          onDecided={() => void loadAll()}
        />
      ) : null}
      {reimburseOpen ? (
        <MarkReimbursedModal
          expense={expense}
          onClose={() => setReimburseOpen(false)}
          onDecided={() => void loadAll()}
        />
      ) : null}
    </section>
  );
}
