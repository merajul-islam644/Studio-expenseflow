// Rejection Reasons admin screen — add, edit, deactivate, delete. The
// Reject dialog uses these reasons when rejecting an expense.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { createRejectionReason, deleteRejectionReason, listRejectionReasons, updateRejectionReason } from "../expenses/api";
import { type RejectionReason } from "../expenses/types";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Modal } from "../../shared/ui/Modal";
import { StatusPill } from "../../shared/ui/StatusPill";

export function RejectionReasonsSettings() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["rejection-reasons", "list"],
    queryFn: () => listRejectionReasons(),
    staleTime: 30_000
  });
  const [editing, setEditing] = useState<RejectionReason | undefined>();
  const [creating, setCreating] = useState(false);

  async function handleSave(reason: RejectionReason) {
    if (reason.itemId) {
      const { itemId, ...payload } = reason;
      await updateRejectionReason(itemId, payload);
    } else {
      await createRejectionReason({ ...reason, isActive: true });
    }
    await queryClient.invalidateQueries({ queryKey: ["rejection-reasons"] });
    setEditing(undefined);
    setCreating(false);
  }

  async function handleDelete(itemId: string | undefined) {
    if (!itemId) return;
    await deleteRejectionReason(itemId);
    await queryClient.invalidateQueries({ queryKey: ["rejection-reasons"] });
  }

  const reasons = query.data ?? [];

  return (
    <div className="section-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>Rejection Reasons</h3>
          <p className="section-subtitle">Reasons offered in the Reject dialog.</p>
        </div>
        <button className="primary-button" onClick={() => setCreating(true)}>
          <Plus size={16} /> {t("settings.reasons.add")}
        </button>
      </div>

      {query.isLoading ? <p className="muted">Loading…</p> : reasons.length === 0 ? (
        <p className="muted">No reasons yet.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>{t("settings.reasons.name")}</th>
                <th>{t("settings.reasons.displayName")}</th>
                <th>{t("settings.reasons.active")}</th>
                <th>Sort order</th>
                <th>{t("settings.users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reasons
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((reason) => (
                  <tr key={reason.itemId}>
                    <td data-label="Name"><strong>{reason.name}</strong></td>
                    <td data-label="Display">{reason.displayName}</td>
                    <td data-label="Active">
                      <StatusPill tone={reason.isActive !== false ? "good" : "neutral"}>
                        {reason.isActive !== false ? "Active" : "Inactive"}
                      </StatusPill>
                    </td>
                    <td data-label="Sort">{reason.sortOrder ?? "—"}</td>
                    <td data-label="Actions">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="icon-button" onClick={() => setEditing(reason)} aria-label="Edit">
                          <Save size={16} />
                        </button>
                        <button className="icon-button" onClick={() => handleDelete(reason.itemId)} aria-label="Delete">
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
        <ReasonModal reason={{ name: "", displayName: "", sortOrder: reasons.length + 1, isActive: true }} onClose={() => setCreating(false)} onSave={handleSave} />
      ) : null}
      {editing ? (
        <ReasonModal reason={editing} onClose={() => setEditing(undefined)} onSave={handleSave} />
      ) : null}
    </div>
  );
}

function ReasonModal({ reason, onClose, onSave }: {
  reason: RejectionReason;
  onClose: () => void;
  onSave: (reason: RejectionReason) => Promise<void>;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState<RejectionReason>(reason);
  const [pending, setPending] = useState(false);

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
    <Modal title={reason.itemId ? "Edit reason" : "Add reason"} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <span>{t("settings.reasons.name")}</span>
          <input value={draft.name ?? ""} onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))} required />
        </div>
        <div className="form-field">
          <span>{t("settings.reasons.displayName")}</span>
          <input value={draft.displayName ?? ""} onChange={(event) => setDraft((d) => ({ ...d, displayName: event.target.value }))} required />
        </div>
        <div className="form-field">
          <span>{t("settings.reasons.active")}</span>
          <select value={String(draft.isActive !== false)} onChange={(event) => setDraft((d) => ({ ...d, isActive: event.target.value === "true" }))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="form-field">
          <span>Sort order</span>
          <input
            type="number"
            value={draft.sortOrder ?? 0}
            onChange={(event) => setDraft((d) => ({ ...d, sortOrder: parseInt(event.target.value, 10) }))}
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
