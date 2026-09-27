// Users & Roles admin screen. Lists every user in the tenant, lets the
// admin invite a new user, edit roles + department, and activate or
// deactivate accounts. All mutations go through blocksClient.iam.users
// (no raw fetch). Per the SDK contract, deactivating/activating returns
// the user to their previous state; deactivate removes sign-in but
// keeps the record (and audit history) intact.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, X } from "lucide-react";
import { blocksClient } from "../../lib/blocks/client";
import { listDepartments } from "../expenses/api";
import { formatDate } from "../expenses/types";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { StatusPill } from "../../shared/ui/StatusPill";
import { Modal } from "../../shared/ui/Modal";

const ROLES = [
  { slug: "expense-employee", label: "Employee" },
  { slug: "expense-team-lead", label: "Team Lead" },
  { slug: "expense-dept-manager", label: "Dept. Manager" },
  { slug: "expense-finance-analyst", label: "Finance Analyst" },
  { slug: "expense-finance-director", label: "Finance Director" },
  { slug: "expense-system-admin", label: "System Admin" }
];

type UserRow = {
  itemId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userName?: string;
  active?: boolean;
  roles?: { default?: string[] };
  createdDate?: string;
};

export function UsersRolesSettings() {
  const { t } = useT();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["iam", "users"],
    queryFn: async () => {
      const response = await blocksClient.iam.users.list({ pageNo: 1, pageSize: 100 });
      const record = response as { data?: UserRow[]; items?: UserRow[]; totalCount?: number };
      return (record?.data ?? record?.items ?? []) as UserRow[];
    },
    staleTime: 30_000
  });

  const departmentsQuery = useQuery({
    queryKey: ["settings", "departments"],
    queryFn: () => listDepartments(),
    staleTime: 60_000
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | undefined>();

  const deactivate = useMutation({
    mutationFn: async (userId: string) => blocksClient.iam.users.deactivate({ userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["iam", "users"] })
  });

  const activate = useMutation({
    mutationFn: async (userId: string) => blocksClient.iam.users.activate({ userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["iam", "users"] })
  });

  const users = usersQuery.data ?? [];

  return (
    <div className="section-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>Users & Roles</h3>
          <p className="section-subtitle">Invite, edit, activate, and deactivate users in this organization.</p>
        </div>
        <button className="primary-button" onClick={() => setInviteOpen(true)}>
          <Plus size={16} /> {t("settings.users.invite")}
        </button>
      </div>

      {usersQuery.isLoading ? (
        <p className="muted">Loading…</p>
      ) : users.length === 0 ? (
        <p className="muted">{t("settings.users.empty")}</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>{t("settings.users.name")}</th>
                <th>{t("settings.users.email")}</th>
                <th>{t("settings.users.role")}</th>
                <th>Status</th>
                <th>Created</th>
                <th>{t("settings.users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const fullName = [user.firstName ?? "", user.lastName ?? ""].filter(Boolean).join(" ") || user.userName || user.email || "—";
                const role = user.roles?.default?.[0];
                return (
                  <tr key={user.itemId}>
                    <td data-label="Name"><strong>{fullName}</strong></td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Role">{role ? ROLES.find((r) => r.slug === role)?.label ?? role : "—"}</td>
                    <td data-label="Status">
                      <StatusPill tone={user.active ? "good" : "neutral"}>{user.active ? "Active" : "Inactive"}</StatusPill>
                    </td>
                    <td data-label="Created">{formatDate(user.createdDate)}</td>
                    <td data-label="Actions">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="icon-button" onClick={() => setEditingUser(user)} aria-label="Edit">
                          <Pencil size={16} />
                        </button>
                        {user.active ? (
                          <button className="secondary-button" onClick={() => deactivate.mutate(user.itemId)} disabled={deactivate.isPending}>
                            {t("settings.users.deactivate")}
                          </button>
                        ) : (
                          <button className="secondary-button" onClick={() => activate.mutate(user.itemId)} disabled={activate.isPending}>
                            {t("settings.users.activate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {inviteOpen ? (
        <InviteUserModal
          onClose={() => setInviteOpen(false)}
          onInvited={() => { setInviteOpen(false); queryClient.invalidateQueries({ queryKey: ["iam", "users"] }); }}
        />
      ) : null}
      {editingUser ? (
        <EditUserModal
          user={editingUser}
          departments={departmentsQuery.data ?? []}
          onClose={() => setEditingUser(undefined)}
          onSaved={() => { setEditingUser(undefined); queryClient.invalidateQueries({ queryKey: ["iam", "users"] }); }}
        />
      ) : null}
    </div>
  );
}

function InviteUserModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState(ROLES[0]?.slug ?? "expense-employee");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      await blocksClient.iam.users.create({
        email,
        firstName,
        lastName,
        userName: email.split("@")[0],
        password: `Invite!${Math.random().toString(36).slice(2, 8)}`,
        roles: [role]
      });
      onInvited();
    } catch (caught) {
      setError((caught as Error).message || "Could not invite user.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={t("settings.users.invite")} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <span>{t("settings.users.email")}</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="form-field">
          <span>First name</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        </div>
        <div className="form-field">
          <span>Last name</span>
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        </div>
        <div className="form-field">
          <span>{t("settings.users.role")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {ROLES.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
          </select>
        </div>
        {error ? <p style={{ color: "hsl(var(--destructive))", fontSize: 13 }}>{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={pending}>{t("common.cancel")}</button>
          <button type="submit" className="primary-button" disabled={pending}>
            <Save size={16} /> {pending ? t("common.loading") : t("settings.users.invite.submit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, departments, onClose, onSaved }: {
  user: UserRow;
  departments: { itemId?: string; name?: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useT();
  const initialRole = user.roles?.default?.[0] ?? ROLES[0]?.slug ?? "expense-employee";
  const [role, setRole] = useState(initialRole);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSave() {
    setPending(true);
    setError(undefined);
    try {
      await blocksClient.iam.users.updateAccess({
        userId: user.itemId,
        roles: [role]
      });
      onSaved();
    } catch (caught) {
      setError((caught as Error).message || "Could not update user.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={`Edit ${user.email ?? user.userName ?? "user"}`} onClose={onClose}>
      <div className="form-grid">
        <div className="form-field">
          <span>{t("settings.users.email")}</span>
          <input value={user.email ?? ""} readOnly />
        </div>
        <div className="form-field">
          <span>{t("settings.users.name")}</span>
          <input value={[user.firstName ?? "", user.lastName ?? ""].filter(Boolean).join(" ")} readOnly />
        </div>
        <div className="form-field">
          <span>{t("settings.users.role")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {ROLES.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
          </select>
        </div>
        <div className="form-field">
          <span>Department</span>
          <select disabled>
            <option value="">{departments[0]?.name ?? "—"}</option>
          </select>
        </div>
      </div>
      {error ? <p style={{ color: "hsl(var(--destructive))", fontSize: 13 }}>{error}</p> : null}
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose} disabled={pending}><X size={16} /> {t("common.cancel")}</button>
        <button className="primary-button" onClick={handleSave} disabled={pending}>
          <Save size={16} /> {pending ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </Modal>
  );
}
