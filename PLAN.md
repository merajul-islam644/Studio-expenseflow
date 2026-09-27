# Plan — ExpenseFlow

## Scope
Enterprise expense & reimbursement management app for finance teams. Single organization with departments, six built-in roles, amount-based approval routing, department budgets, audit-ready expense records, real-time notifications, and finance reporting.

The previous run shipped the shell + Sign-In & Account Security. This run builds the full product on top.

## Branding & shell
- [x] Tokens, palette, typography, shell — already shipped last run. (no skill)

## Data model (blocks-data-gateway-configuration)
- [x] Define `Department` schema (name, region, monthlyBudgetAmount). (blocks-data-gateway-configuration)
- [x] Define `ExpenseCategory` schema (name, displayName). (blocks-data-gateway-configuration)
- [x] Define `RejectionReason` schema (name, displayName, sortOrder). (blocks-data-gateway-configuration)
- [x] Define `ApprovalRule` schema (minAmount, maxAmount, level). (blocks-data-gateway-configuration)
- [x] Define `Expense` schema (description, department, category, expenseDate, amount, status, currentLevel, submittedBy, approverLevel1, approverLevel2, approverLevel3, approvalRoute, rejectionReasonId, rejectionComments, paidAt, resubmitCount). (blocks-data-gateway-configuration)
- [x] Define `ExpenseLineItem` schema (expenseId, description, category, amount, receiptFileId). (blocks-data-gateway-configuration)
- [x] Define `Budget` schema (departmentId, period, budgetAmount, spentAmount, periodStart). (blocks-data-gateway-configuration)
- [x] Define `ExpenseApproval` schema (expenseId, level, approverUserId, approverName, decision, decidedAt, comments). (blocks-data-gateway-configuration)
- [x] Push schemas and reload. (blocks-data-gateway-configuration)

## Data access rules (blocks-data-gateway-configuration)
- [x] Department — public read for all signed-in; admin only write. (blocks-data-gateway-configuration)
- [x] ExpenseCategory — public read for all signed-in; admin only write. (blocks-data-gateway-configuration)
- [x] RejectionReason — public read for all signed-in; admin only write. (blocks-data-gateway-configuration)
- [x] ApprovalRule — public read for all signed-in; admin only write. (blocks-data-gateway-configuration)
- [x] Budget — public read; admin only write. (blocks-data-gateway-configuration)
- [x] Expense — read scope by role; submitter can create/update their own draft; approvers can update any expense waiting on their level; admin manages all. (blocks-data-gateway-configuration)
- [x] ExpenseLineItem — same access as parent Expense. (blocks-data-gateway-configuration)
- [x] ExpenseApproval — public read; approvers/admins write. (blocks-data-gateway-configuration)
- [x] Deploy rules and reload. (blocks-data-gateway-configuration)

## Roles & permissions (blocks-iam-access-control)
- [x] Create `Employee`, `TeamLead`, `DeptManager`, `FinanceAnalyst`, `FinanceDirector`, `SystemAdmin` roles. (blocks-iam-access-control)
- [x] Assign per-role permission slugs: expense:submit, expense:approve-l1/l2/l3, expense:reject, expense:bulk-export, expense:manage-org. (blocks-iam-access-control)

## Navigation & home
- [x] Replace `navItems.ts` with the PRD sections: Overview, Expenses (All, My, Pending), Finance (Budgets, Reports), Workspace (Alerts, Settings). (no skill)
- [x] `/` → Dashboard. Profile reachable from the user menu. (no skill)

## Approval routing logic (pure UI)
- [x] Approval-route preview component reads active rules, totals the expense, and lists the required levels. (no skill)

## Dashboard
- [x] KPI cards: Total Expenses (month), Pending Approvals, Budget Used, Reimbursements. (no skill)
- [x] Recent Expenses list, Spending by Department summary, Budget Utilization panel, Budget Warning Alerts, Recent Notifications. (no skill)

## Submit Expense
- [x] Header (description, department, date, category), repeating line items, receipt attachment per item, live total, live route preview, Save Draft / Submit. (blocks-data-storage)
- [x] Validate receipt policy ($25+ requires receipt), expense date window (not future, not older than 90 days). (no skill)
- [x] Block submit when department is at 100% budget. (no skill)

## Expense List
- [x] Tabs: All, My Expenses, Pending Approval, Approved, Rejected. (no skill)
- [x] Search, filters (status, department, category, amount range, date range), pagination, sort. (no skill)
- [x] Bulk export CSV/PDF for users with `expense:bulk-export`. (no skill)

## Expense Details
- [x] Header, line items, receipts (preview/download/remove on draft), total, status pill, vertical approval timeline. (no skill)
- [x] Rejection reason + comments visible on rejected expenses. (no skill)
- [x] Approve/Reject actions in header for the current approver; hidden for submitter. (no skill)

## Approval Center (Pending Approvals)
- [x] Cards: employee, department, description, amount, submitted date, level, receipt status, budget status. (no skill)
- [x] View, Approve (next level), Reject. Self-approval blocked. (no skill)

## Reject Expense
- [x] Modal: required reason (from configured list), optional comments. (no skill)

## Budgets
- [x] Cards per department: budget, spent, remaining, utilization %, status (Normal / Warning / Blocked). (no skill)
- [x] Admin can edit monthly amount; status recalculates. (no skill)

## Reports
- [x] Filters: date range, department, category. (no skill)
- [x] Metrics: Total Spending, Rejection Rate, Average Approval Time, Reimbursement Total, Approval Volume. (no skill)
- [x] Charts: Spending by Department, Spending by Category, Monthly Spending, Approval Metrics. (no skill)
- [x] CSV/PDF export for users with `expense:bulk-export`. (no skill)

## Notifications
- [x] Header bell with unread count badge (9+ cap). (blocks-notifier)
- [x] Alerts inbox with category filters and Mark all as read. (blocks-notifier)
- [x] In-app notifier calls for approval/submitted/rejected events. (blocks-notifier)

## Settings (System Admin only)
- [x] Sections: General, Organization, Users & Roles, Approval Rules, Budgets, Expense Categories, Rejection Reasons, Notifications, Localization, Fiscal Rules. (blocks-iam-users + no skill)
- [x] Invite/edit/activate/deactivate users and assign roles + department. (blocks-iam-users)
- [x] Approval rules: amount thresholds, save with warning about existing expenses. (no skill)

## Demo Data
- [x] First-load seeding: one demo organization, 5 departments, 8 categories, 6 rejection reasons, 3 approval rules, 5 budgets (incl. Warning + Blocked), and ~25 expenses spanning every status (Draft, Submitted, Pending L1/L2/L3, Approved, Reimbursed, Rejected, Needs Revision, Blocked). (no skill)

## App-Wide UX States & Responsive Behavior
- [x] Loading skeletons, empty states, error states with retry, permission-denied states across all pages. (no skill)
- [x] Sidebar collapses on tablet, becomes drawer on mobile; tables → card stacks; forms collapse to single column. (no skill)

## Build & verify
- [x] `npm run build` must stay green after each item and at the end. (no skill)
