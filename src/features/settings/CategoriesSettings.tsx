// Expense Categories admin screen — add, edit, delete. Categories are
// available globally on every new expense and on every line item.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { createExpenseCategory, deleteExpenseCategory, listExpenseCategories, updateExpenseCategory } from "../expenses/api";
import { type ExpenseCategory } from "../expenses/types";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Modal } from "../../shared/ui/Modal";

export function CategoriesSettings() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["expense-categories", "list"],
    queryFn: () => listExpenseCategories(),
    staleTime: 30_000
  });
  const [editing, setEditing] = useState<ExpenseCategory | undefined>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSave(category: ExpenseCategory) {
    setError(undefined);
    try {
      if (category.itemId) {
        const { itemId, ...payload } = category;
        await updateExpenseCategory(itemId, payload);
      } else {
        await createExpenseCategory(category);
      }
      await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setEditing(undefined);
      setCreating(false);
    } catch (caught) {
      setError((caught as Error).message || "Could not save.");
    }
  }

  async function handleDelete(itemId: string | undefined) {
    if (!itemId) return;
    await deleteExpenseCategory(itemId);
    await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
  }

  const categories = query.data ?? [];

  return (
    <div className="section-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>Expense Categories</h3>
          <p className="section-subtitle">Categories available on expenses and line items.</p>
        </div>
        <button className="primary-button" onClick={() => setCreating(true)}>
          <Plus size={16} /> {t("settings.categories.add")}
        </button>
      </div>

      {error ? <p style={{ color: "hsl(var(--destructive))", fontSize: 13 }}>{error}</p> : null}

      {query.isLoading ? <p className="muted">Loading…</p> : categories.length === 0 ? (
        <p className="muted">No categories yet.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>{t("settings.categories.name")}</th>
                <th>{t("settings.categories.displayName")}</th>
                <th>Sort order</th>
                <th>{t("settings.users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {categories
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((category) => (
                  <tr key={category.itemId}>
                    <td data-label="Name"><strong>{category.name}</strong></td>
                    <td data-label="Display">{category.displayName}</td>
                    <td data-label="Sort order">{category.sortOrder ?? "—"}</td>
                    <td data-label="Actions">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="icon-button" onClick={() => setEditing(category)} aria-label="Edit">
                          <Save size={16} />
                        </button>
                        <button className="icon-button" onClick={() => handleDelete(category.itemId)} aria-label="Delete">
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
        <CategoryModal category={{ name: "", displayName: "", sortOrder: categories.length + 1 }} onClose={() => setCreating(false)} onSave={handleSave} />
      ) : null}
      {editing ? (
        <CategoryModal category={editing} onClose={() => setEditing(undefined)} onSave={handleSave} />
      ) : null}
    </div>
  );
}

function CategoryModal({ category, onClose, onSave }: {
  category: ExpenseCategory;
  onClose: () => void;
  onSave: (category: ExpenseCategory) => Promise<void>;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState<ExpenseCategory>(category);
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
    <Modal title={category.itemId ? "Edit category" : "Add category"} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <span>{t("settings.categories.name")}</span>
          <input value={draft.name ?? ""} onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))} required />
        </div>
        <div className="form-field">
          <span>{t("settings.categories.displayName")}</span>
          <input value={draft.displayName ?? ""} onChange={(event) => setDraft((d) => ({ ...d, displayName: event.target.value }))} required />
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
