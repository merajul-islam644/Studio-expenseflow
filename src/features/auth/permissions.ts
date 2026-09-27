// Permission helpers that read the signed-in user's roles from IAM and
// translate them into ExpenseFlow's coarse-grained permission booleans.
// The data layer trusts these checks for feature gating; gating lives
// here (not at the schema level) so role grants stay editable from the
// Settings screen at runtime.
import type { BlocksUser } from "@seliseblocks/client";

export const PERMISSIONS = {
  submit: "expense::submit",
  approveL1: "expense::approve-l1",
  approveL2: "expense::approve-l2",
  approveL3: "expense::approve-l3",
  reject: "expense::reject",
  bulkExport: "expense::bulk-export",
  manageOrg: "expense::manage-org"
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function userHasPermission(user: BlocksUser | undefined, key: PermissionKey): boolean {
  const resource = PERMISSIONS[key];
  if (!user?.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(resource);
}

export function userHasAnyRole(user: BlocksUser | undefined, slugs: string[]): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false;
  return user.roles.some((role) => slugs.includes(role));
}

export function userIsAdmin(user: BlocksUser | undefined): boolean {
  return userHasPermission(user, "manageOrg") || userHasAnyRole(user, ["expense-system-admin"]);
}

export function userIsFinance(user: BlocksUser | undefined): boolean {
  return userHasAnyRole(user, ["expense-finance-analyst", "expense-finance-director", "expense-system-admin"]);
}

// Convenience: does this user hold the approval permission for a given
// level? `1` = Team Lead, `2` = Dept Manager, `3` = Finance Director.
export function userCanApproveLevel(user: BlocksUser | undefined, level: 1 | 2 | 3): boolean {
  if (level === 1) return userHasPermission(user, "approveL1");
  if (level === 2) return userHasPermission(user, "approveL2");
  if (level === 3) return userHasPermission(user, "approveL3");
  return false;
}

// Pretty role label for chips and the user menu.
export function userPrimaryRoleLabel(user: BlocksUser | undefined): string {
  if (!user?.roles || user.roles.length === 0) return "User";
  const role = user.roles[0] ?? "User";
  if (role === "expense-system-admin") return "System Admin";
  if (role === "expense-finance-director") return "Finance Director";
  if (role === "expense-finance-analyst") return "Finance Analyst";
  if (role === "expense-dept-manager") return "Dept. Manager";
  if (role === "expense-team-lead") return "Team Lead";
  if (role === "expense-employee") return "Employee";
  return role;
}
