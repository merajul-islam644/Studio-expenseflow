// Approval Rules admin screen. Lists the current rules, lets the admin
// add / edit / delete, and shows the warning the PRD requires before any
// save: changing rules affects newly-submitted expenses only; existing
// expenses keep their route at submission time.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, TriangleAlert, X } from "lucide-react";
import { createApprovalRule, deleteApprovalRule, listApprovalRules, updateApprovalRule } from "../expenses/api";
import { type ApprovalRule } from "../expenses/types";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Modal } from "../../shared/ui/Modal";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";

export function ApprovalRulesSettings() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({
    queryKey: ["approval-rules", "list"],
    queryFn: () => listApprovalRules(),
    staleTime: 30_000
  });

  const [editing, setEditing] = useState<ApprovalRule | undefined>();
  const [creating, setCreating] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [pendingSave, setPendingSave] = useState<ApprovalRule[]>([]);

  const rules = rulesQuery.data ?? [];

  function startCreate() {
    setCreating(true);
  }

  function startEdit(rule: ApprovalRule) {
    setEditing(rule);
  }

  async function handleDelete(rule: ApprovalRule) {
    if (!rule.itemId) return;
    await deleteApprovalRule(rule.itemId);
    await queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
  }

  function requestSave(updated: ApprovalRule) {
    setEditing(undefined);
    setCreating(false);
    setPendingSave([updated]);
    setConfirmSave(true);
  }

  async function commitSave() {
    for (const rule of pendingSave) {
      if (!rule.itemId) continue;
      const { itemId, ...payload } = rule;
      await updateApprovalRule(itemId, payload);
    }
    await queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
    setPendingSave([]);
    setConfirmSave(false);
  }

  return (
    <div className="section-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>Approval Rules</h3>
          <p className="section-subtitle">Amount-based approval routing — at submission time, the expense's total picks the required levels from these rules.</p>
        </div>
        <button className="primary-button" onClick={startCreate}>
          <Plus size={16} /> {t("settings.approvalRules.addLevel")}
        </button>
      </div>

      <div className="alert-row alert-warning" style={{ marginTop: 8 }}>
        <TriangleAlert size={16} />
        <div>
          <strong>Heads up</strong>
          <p>{t("settings.approvalRules.warning")}</p>
        </div>
      </div>

      {rulesQuery.isLoading ? <p className="muted">Loading…</p> : rules.length === 0 ? (
        <p className="muted">No rules configured yet.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>{t("settings.approvalRules.label")}</th>
                <th>{t("settings.approvalRules.min")}</th>
                <th>{t("settings.approvalRules.max")}</th>
                <th>{t("settings.approvalRules.level")}</th>
                <th>{t("settings.users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rules
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((rule) => (
                  <tr key={rule.itemId}>
                    <td data-label="Label">{rule.label}</td>
                    <td data-label="Min">${(rule.minAmount ?? 0).toFixed(2)}</td>
                    <td data-label="Max">{rule.maxAmount == null ? "No limit" : `$${(rule.maxAmount ?? 0).toFixed(2)}`}</td>
                    <td data-label="Level">Level {rule.level} — {levelLabel(rule.level ?? 1)}</td>
                    <td data-label="Actions">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="icon-button" onClick={() => startEdit(rule)} aria-label="Edit">
                          <Save size={16} />
                        </button>
                        <button className="icon-button" onClick={() => handleDelete(rule)} aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <RuleModal
          rule={{ label: "", minAmount: 0, maxAmount: undefined, level: 1, sortOrder: rules.length + 1 }}
          onClose={() => setCreating(false)}
          onSave={async (rule) => {
            const created = await createApprovalRule(rule);
            await queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
            const itemId = (created as { data?: { itemId?: string } } | undefined)?.data?.itemId;
            setCreating(false);
            requestSave({ ...rule, itemId });
          }}
        />
      ) : null}

      {editing ? (
        <RuleModal
          rule={editing}
          onClose={() => setEditing(undefined)}
          onSave={async (rule) => {
            requestSave(rule);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmSave}
        title={t("settings.approvalRules.confirm")}
        message={t("settings.approvalRules.warning")}
        confirmLabel={t("common.save")}
        onConfirm={commitSave}
        onCancel={() => { setConfirmSave(false); setPendingSave([]); }}
      />
    </div>
  );
}

function levelLabel(level: number): string {
  if (level === 1) return "Team Lead";
  if (level === 2) return "Department Manager";
  if (level === 3) return "Finance Director";
  return "—";
}

function RuleModal({ rule, onClose, onSave }: {
  rule: ApprovalRule;
  onClose: () => void;
  onSave: (next: ApprovalRule) => Promise<void>;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState<ApprovalRule>(rule);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDraft(rule);
  }, [rule]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await onSave(draft);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={rule.itemId ? "Edit rule" : "Add rule"} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <span>{t("settings.approvalRules.label")}</span>
          <input value={draft.label ?? ""} onChange={(event) => setDraft((d) => ({ ...d, label: event.target.value }))} required />
        </div>
        <div className="form-field">
          <span>{t("settings.approvalRules.level")}</span>
          <select value={draft.level ?? 1} onChange={(event) => setDraft((d) => ({ ...d, level: parseInt(event.target.value, 10) as 1 | 2 | 3 }))}>
            <option value={1}>1 — Team Lead</option>
            <option value={2}>2 — Department Manager</option>
            <option value={3}>3 — Finance Director</option>
          </select>
        </div>
        <div className="form-field">
          <span>{t("settings.approvalRules.min")}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.minAmount ?? 0}
            onChange={(event) => setDraft((d) => ({ ...d, minAmount: parseFloat(event.target.value) }))}
            required
          />
        </div>
        <div className="form-field">
          <span>{t("settings.approvalRules.max")}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.maxAmount ?? ""}
            onChange={(event) => setDraft((d) => ({ ...d, maxAmount: event.target.value === "" ? null : parseFloat(event.target.value) }))}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={pending}><X size={16} /> {t("common.cancel")}</button>
          <button type="submit" className="primary-button" disabled={pending}>
            <Save size={16} /> {pending ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
