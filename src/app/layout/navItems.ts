import {
  Bell,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Receipt,
  Settings,
  Wallet
} from "lucide-react";

// One ordered list of every primary section the user sees in the sidebar.
// Group labels (the ones in the PRD — Overview, Expenses, Finance,
// Workspace) are rendered from `navItems.groups` and matched against each
// item's `group`. The active path drives the topbar context label.
export type NavItem = {
  group: "Overview" | "Expenses" | "Finance" | "Workspace";
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
};

export const navItems: { groups: Array<{ label: string; items: NavItem[] }> } = {
  groups: [
    {
      label: "Overview",
      items: [
        { group: "Overview", href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard }
      ]
    },
    {
      label: "Expenses",
      items: [
        { group: "Expenses", href: "/expenses", labelKey: "nav.expenses.all", icon: Receipt },
        { group: "Expenses", href: "/expenses/mine", labelKey: "nav.expenses.mine", icon: Wallet },
        { group: "Expenses", href: "/expenses/pending", labelKey: "nav.expenses.pending", icon: ClipboardList }
      ]
    },
    {
      label: "Finance",
      items: [
        { group: "Finance", href: "/budgets", labelKey: "nav.budgets", icon: CircleDollarSign },
        { group: "Finance", href: "/reports", labelKey: "nav.reports", icon: FileSpreadsheet }
      ]
    },
    {
      label: "Workspace",
      items: [
        { group: "Workspace", href: "/alerts", labelKey: "nav.alerts", icon: Bell },
        { group: "Workspace", href: "/settings", labelKey: "nav.settings", icon: Settings }
      ]
    }
  ]
};

export const allNavItems: NavItem[] = navItems.groups.flatMap((group) => group.items);

export function findNavItem(href: string): NavItem | undefined {
  return allNavItems.find((item) => item.href === href);
}
