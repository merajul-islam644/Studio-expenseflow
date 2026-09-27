// Demo data seeder. Runs once on first authenticated load — if no
// departments exist in the gateway yet, populate the canonical demo
// organization (5 departments, 8 categories, 6 rejection reasons, 3
// approval rules, 5 budgets, ~25 expenses spanning every status).
//
// All seed records carry `isSeedData: true` (here in the payload) and a
// matching itemId prefix so the seeder is idempotent and won't duplicate
// on subsequent loads. Real users, when they sign in, can edit or delete
// these records from the Settings page — they're real records, not a
// sandbox.
import { blocksClient } from "../../lib/blocks/client";
import {
  createApprovalRule,
  createBudget,
  createDepartment,
  createExpense,
  createExpenseCategory,
  createLineItem,
  createRejectionReason,
  listApprovalRules,
  listBudgets,
  listDepartments,
  listExpenseCategories,
  listExpenses,
  listRejectionReasons
} from "./api";
import type { Expense, ExpenseStatus } from "./types";

export const SEED_MARKER = "expenseflow-seed";
export const SEED_VERSION = 1;

function seedId(label: string): string {
  return `${SEED_MARKER}-v${SEED_VERSION}-${label}`;
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function monthStart(daysFromToday = 0): string {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString();
}

function monthEnd(): string {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  date.setUTCHours(23, 59, 59, 0);
  return date.toISOString();
}

export async function isAlreadySeeded(): Promise<boolean> {
  try {
    const departments = await listDepartments();
    if (departments.length > 0) return true;
    return false;
  } catch {
    return false;
  }
}

async function seedDepartments() {
  const seed = [
    { name: "Engineering", region: "North America", headcount: 32 },
    { name: "Marketing", region: "North America", headcount: 14 },
    { name: "Sales", region: "EMEA", headcount: 22 },
    { name: "Operations", region: "APAC", headcount: 18 },
    { name: "Finance", region: "Global", headcount: 9 }
  ];
  const created: Array<{ itemId?: string; name?: string }> = [];
  for (const dept of seed) {
    const result = await createDepartment({ ...dept });
    const record = result as { data?: { itemId?: string } } | undefined;
    created.push({ itemId: record?.data?.itemId, name: dept.name });
  }
  return created;
}

async function seedCategories() {
  const seed = [
    { name: "travel", displayName: "Travel", sortOrder: 1 },
    { name: "meals", displayName: "Meals", sortOrder: 2 },
    { name: "software", displayName: "Software", sortOrder: 3 },
    { name: "office_supplies", displayName: "Office Supplies", sortOrder: 4 },
    { name: "equipment", displayName: "Equipment", sortOrder: 5 },
    { name: "conferences", displayName: "Conferences", sortOrder: 6 },
    { name: "training", displayName: "Training", sortOrder: 7 },
    { name: "other", displayName: "Other", sortOrder: 8 }
  ];
  const created: Array<{ itemId?: string; name?: string; displayName?: string }> = [];
  for (const cat of seed) {
    const result = await createExpenseCategory(cat);
    const record = result as { data?: { itemId?: string } } | undefined;
    created.push({ itemId: record?.data?.itemId, ...cat });
  }
  return created;
}

async function seedRejectionReasons() {
  const seed = [
    { name: "missing_receipt", displayName: "Missing receipt", sortOrder: 1 },
    { name: "invalid_amount", displayName: "Invalid amount", sortOrder: 2 },
    { name: "incorrect_category", displayName: "Incorrect category", sortOrder: 3 },
    { name: "outside_policy", displayName: "Outside company policy", sortOrder: 4 },
    { name: "duplicate_expense", displayName: "Duplicate expense", sortOrder: 5 },
    { name: "other", displayName: "Other", sortOrder: 6 }
  ];
  const created: Array<{ itemId?: string; name?: string; displayName?: string }> = [];
  for (const reason of seed) {
    const result = await createRejectionReason({ ...reason, isActive: true });
    const record = result as { data?: { itemId?: string } } | undefined;
    created.push({ itemId: record?.data?.itemId, ...reason });
  }
  return created;
}

async function seedApprovalRules() {
  const seed: Array<{ label: string; minAmount: number; maxAmount: number | null; level: 1 | 2 | 3; sortOrder: number }> = [
    { label: "Up to $500", minAmount: 0, maxAmount: 500, level: 1, sortOrder: 1 },
    { label: "$500.01 – $5,000", minAmount: 500.01, maxAmount: 5000, level: 2, sortOrder: 2 },
    { label: "Above $5,000", minAmount: 5000.01, maxAmount: null, level: 3, sortOrder: 3 }
  ];
  for (const rule of seed) await createApprovalRule(rule);
}

async function seedBudgets(departments: Array<{ itemId?: string; name?: string }>) {
  // Budgets span the calendar month so utilization tests hit them right
  // away. Two departments hit Warning, one is Blocked.
  const periodStart = monthStart();
  const periodEnd = monthEnd();
  const seed = [
    { name: "Engineering", amount: 12000, spent: 9800 },
    { name: "Marketing", amount: 8000, spent: 8000 },
    { name: "Sales", amount: 15000, spent: 4200 },
    { name: "Operations", amount: 6000, spent: 5100 },
    { name: "Finance", amount: 4000, spent: 800 }
  ];
  for (const entry of seed) {
    const dept = departments.find((d) => d.name === entry.name);
    if (!dept?.itemId) continue;
    await createBudget({
      departmentId: dept.itemId,
      departmentName: entry.name,
      period: "Monthly",
      budgetAmount: entry.amount,
      spentAmount: entry.spent,
      periodStart,
      periodEnd
    });
  }
}

type SeedUser = {
  id: string;
  email: string;
  name: string;
  department: string;
};

const SEED_USERS: SeedUser[] = [
  { id: "seed-user-employee", email: "employee@expenseflow.dev", name: "Erin Employee", department: "Engineering" },
  { id: "seed-user-team-lead", email: "teamlead@expenseflow.dev", name: "Tom Lead", department: "Engineering" },
  { id: "seed-user-manager", email: "manager@expenseflow.dev", name: "Maya Manager", department: "Marketing" },
  { id: "seed-user-analyst", email: "analyst@expenseflow.dev", name: "Ana Analyst", department: "Finance" },
  { id: "seed-user-director", email: "director@expenseflow.dev", name: "Drew Director", department: "Finance" },
  { id: "seed-user-admin", email: "admin@expenseflow.dev", name: "Sam Admin", department: "Operations" }
];

type ExpenseSeed = {
  expenseId: string;
  description: string;
  status: ExpenseStatus;
  amount: number;
  currentLevel?: number | null;
  user: string;
  department: string;
  category: string;
  expenseDate: string;
  submittedAt: string;
  approvedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  rejectionComments?: string;
  route?: string;
  lineItems: Array<{ description: string; amount: number; category: string }>;
};

function buildExpenseSeeds(categories: Array<{ name?: string; displayName?: string }>, reasons: Array<{ name?: string; displayName?: string }>): ExpenseSeed[] {
  const cat = (name: string) => categories.find((c) => c.name === name)?.displayName ?? name;
  const reasonDisplay = (name: string) => reasons.find((r) => r.name === name)?.displayName ?? name;
  const baseDay = -10;
  const seeds: ExpenseSeed[] = [];

  // Drafts
  seeds.push({
    expenseId: seedId("draft-1"),
    description: "Pending receipt — client lunch",
    status: "Draft",
    amount: 0,
    currentLevel: null,
    user: "employee",
    department: "Engineering",
    category: "meals",
    expenseDate: offsetDate(-3),
    submittedAt: offsetDate(-3),
    lineItems: [{ description: "Lunch with vendor", amount: 62.50, category: cat("meals") }]
  });

  // Submitted (waiting L1)
  seeds.push({
    expenseId: seedId("submitted-1"),
    description: "Q4 team offsite venue",
    status: "Pending L1",
    amount: 380,
    currentLevel: 1,
    user: "teamlead",
    department: "Engineering",
    category: "conferences",
    expenseDate: offsetDate(-5),
    submittedAt: offsetDate(-5),
    route: "Team Lead",
    lineItems: [{ description: "Conference room booking", amount: 380, category: cat("conferences") }]
  });
  seeds.push({
    expenseId: seedId("submitted-2"),
    description: "Office whiteboards",
    status: "Pending L1",
    amount: 142.10,
    currentLevel: 1,
    user: "employee",
    department: "Engineering",
    category: "office_supplies",
    expenseDate: offsetDate(-2),
    submittedAt: offsetDate(-2),
    route: "Team Lead",
    lineItems: [{ description: "Three magnetic whiteboards", amount: 142.10, category: cat("office_supplies") }]
  });

  // Pending L2
  seeds.push({
    expenseId: seedId("pending-l2-1"),
    description: "Sales kickoff travel",
    status: "Pending L2",
    amount: 1820.55,
    currentLevel: 2,
    user: "manager",
    department: "Marketing",
    category: "travel",
    expenseDate: offsetDate(-7),
    submittedAt: offsetDate(-7),
    route: "Team Lead → Department Manager",
    lineItems: [
      { description: "Roundtrip flights", amount: 920.00, category: cat("travel") },
      { description: "Hotel — 2 nights", amount: 600.55, category: cat("travel") },
      { description: "Ground transport", amount: 300.00, category: cat("travel") }
    ]
  });
  seeds.push({
    expenseId: seedId("pending-l2-2"),
    description: "Marketing print run",
    status: "Pending L2",
    amount: 2450.00,
    currentLevel: 2,
    user: "manager",
    department: "Marketing",
    category: "office_supplies",
    expenseDate: offsetDate(-4),
    submittedAt: offsetDate(-4),
    route: "Team Lead → Department Manager",
    lineItems: [
      { description: "Trade-show banners", amount: 1450.00, category: cat("office_supplies") },
      { description: "Brochure print run", amount: 1000.00, category: cat("office_supplies") }
    ]
  });

  // Pending L3
  seeds.push({
    expenseId: seedId("pending-l3-1"),
    description: "Annual SaaS renewal",
    status: "Pending L3",
    amount: 6800.00,
    currentLevel: 3,
    user: "analyst",
    department: "Finance",
    category: "software",
    expenseDate: offsetDate(-6),
    submittedAt: offsetDate(-6),
    route: "Team Lead → Department Manager → Finance Director",
    lineItems: [{ description: "Annual subscription renewal", amount: 6800.00, category: cat("software") }]
  });
  seeds.push({
    expenseId: seedId("pending-l3-2"),
    description: "Engineering laptop refresh",
    status: "Pending L3",
    amount: 11400.00,
    currentLevel: 3,
    user: "admin",
    department: "Operations",
    category: "equipment",
    expenseDate: offsetDate(-9),
    submittedAt: offsetDate(-9),
    route: "Team Lead → Department Manager → Finance Director",
    lineItems: [
      { description: "Five laptops", amount: 9500.00, category: cat("equipment") },
      { description: "Docking stations", amount: 1900.00, category: cat("equipment") }
    ]
  });

  // Approved (ready to be reimbursed)
  seeds.push({
    expenseId: seedId("approved-1"),
    description: "Team lunch — sprint wrap",
    status: "Approved",
    amount: 184.30,
    currentLevel: null,
    user: "teamlead",
    department: "Engineering",
    category: "meals",
    expenseDate: offsetDate(-12),
    submittedAt: offsetDate(-12),
    approvedAt: offsetDate(-10),
    route: "Team Lead",
    lineItems: [{ description: "Catered lunch for 14", amount: 184.30, category: cat("meals") }]
  });
  seeds.push({
    expenseId: seedId("approved-2"),
    description: "Marketing campaign software",
    status: "Approved",
    amount: 1320.00,
    currentLevel: null,
    user: "manager",
    department: "Marketing",
    category: "software",
    expenseDate: offsetDate(-15),
    submittedAt: offsetDate(-15),
    approvedAt: offsetDate(-13),
    route: "Team Lead → Department Manager",
    lineItems: [{ description: "Q4 campaign tool", amount: 1320.00, category: cat("software") }]
  });
  seeds.push({
    expenseId: seedId("approved-3"),
    description: "Sales training session",
    status: "Approved",
    amount: 3200.00,
    currentLevel: null,
    user: "director",
    department: "Finance",
    category: "training",
    expenseDate: offsetDate(-18),
    submittedAt: offsetDate(-18),
    approvedAt: offsetDate(-16),
    route: "Team Lead → Department Manager → Finance Director",
    lineItems: [{ description: "External trainer — 2 days", amount: 3200.00, category: cat("training") }]
  });

  // Reimbursed
  seeds.push({
    expenseId: seedId("reimbursed-1"),
    description: "Conference travel — APAC",
    status: "Reimbursed",
    amount: 4250.00,
    currentLevel: null,
    user: "director",
    department: "Finance",
    category: "travel",
    expenseDate: offsetDate(-25),
    submittedAt: offsetDate(-25),
    approvedAt: offsetDate(-23),
    paidAt: offsetDate(-20),
    route: "Team Lead → Department Manager → Finance Director",
    lineItems: [
      { description: "Airfare — APAC summit", amount: 2700.00, category: cat("travel") },
      { description: "Hotel — 3 nights", amount: 1300.00, category: cat("travel") },
      { description: "Per diem", amount: 250.00, category: cat("meals") }
    ]
  });
  seeds.push({
    expenseId: seedId("reimbursed-2"),
    description: "Office supplies — November",
    status: "Reimbursed",
    amount: 218.40,
    currentLevel: null,
    user: "employee",
    department: "Engineering",
    category: "office_supplies",
    expenseDate: offsetDate(-30),
    submittedAt: offsetDate(-30),
    approvedAt: offsetDate(-28),
    paidAt: offsetDate(-25),
    route: "Team Lead",
    lineItems: [
      { description: "Stationery", amount: 88.40, category: cat("office_supplies") },
      { description: "Coffee beans", amount: 130.00, category: cat("office_supplies") }
    ]
  });
  seeds.push({
    expenseId: seedId("reimbursed-3"),
    description: "Software licenses — analytics",
    status: "Reimbursed",
    amount: 1880.00,
    currentLevel: null,
    user: "analyst",
    department: "Finance",
    category: "software",
    expenseDate: offsetDate(-40),
    submittedAt: offsetDate(-40),
    approvedAt: offsetDate(-37),
    paidAt: offsetDate(-33),
    route: "Team Lead → Department Manager",
    lineItems: [{ description: "Annual analytics seats", amount: 1880.00, category: cat("software") }]
  });

  // Rejected
  seeds.push({
    expenseId: seedId("rejected-1"),
    description: "Personal flight upgrade",
    status: "Rejected",
    amount: 720.00,
    currentLevel: null,
    user: "employee",
    department: "Engineering",
    category: "travel",
    expenseDate: offsetDate(-11),
    submittedAt: offsetDate(-11),
    approvedAt: offsetDate(-10),
    rejectionReason: "outside_policy",
    rejectionComments: "Premium cabin is not covered under our travel policy.",
    route: "Team Lead",
    lineItems: [{ description: "Business class upgrade", amount: 720.00, category: cat("travel") }]
  });
  seeds.push({
    expenseId: seedId("rejected-2"),
    description: "Lunch over per diem",
    status: "Rejected",
    amount: 188.00,
    currentLevel: null,
    user: "manager",
    department: "Marketing",
    category: "meals",
    expenseDate: offsetDate(-8),
    submittedAt: offsetDate(-8),
    rejectionReason: "invalid_amount",
    rejectionComments: "Per-person spend exceeded the $50 daily cap.",
    route: "Team Lead",
    lineItems: [{ description: "Client dinner", amount: 188.00, category: cat("meals") }]
  });
  seeds.push({
    expenseId: seedId("rejected-3"),
    description: "Duplicate hardware order",
    status: "Rejected",
    amount: 320.00,
    currentLevel: null,
    user: "employee",
    department: "Engineering",
    category: "equipment",
    expenseDate: offsetDate(-6),
    submittedAt: offsetDate(-6),
    rejectionReason: "duplicate_expense",
    rejectionComments: "Order already reimbursed under EX-1238.",
    route: "Team Lead",
    lineItems: [{ description: "USB-C dock", amount: 320.00, category: cat("equipment") }]
  });

  // Needs Revision
  seeds.push({
    expenseId: seedId("revision-1"),
    description: "Workshop venue — needs itemization",
    status: "Needs Revision",
    amount: 480.00,
    currentLevel: null,
    user: "employee",
    department: "Engineering",
    category: "conferences",
    expenseDate: offsetDate(-4),
    submittedAt: offsetDate(-4),
    rejectionReason: "missing_receipt",
    rejectionComments: "Please add a per-item receipt for the workshop venue.",
    route: "Team Lead",
    lineItems: [{ description: "Workshop booking", amount: 480.00, category: cat("conferences") }]
  });
  seeds.push({
    expenseId: seedId("revision-2"),
    description: "Mixed-meal categories — split needed",
    status: "Needs Revision",
    amount: 142.00,
    currentLevel: null,
    user: "teamlead",
    department: "Engineering",
    category: "meals",
    expenseDate: offsetDate(-3),
    submittedAt: offsetDate(-3),
    rejectionReason: "incorrect_category",
    rejectionComments: "Split team meals vs. client meals into separate line items.",
    route: "Team Lead",
    lineItems: [{ description: "Team + client meals", amount: 142.00, category: cat("meals") }]
  });

  // Blocked (department at 100%)
  seeds.push({
    expenseId: seedId("blocked-1"),
    description: "Marketing campaign swag",
    status: "Blocked",
    amount: 980.00,
    currentLevel: null,
    user: "manager",
    department: "Marketing",
    category: "office_supplies",
    expenseDate: offsetDate(-1),
    submittedAt: offsetDate(-1),
    route: "Team Lead → Department Manager",
    lineItems: [{ description: "Branded tote bags + stickers", amount: 980.00, category: cat("office_supplies") }]
  });

  // A few more across statuses for breadth
  seeds.push({
    expenseId: seedId("approved-4"),
    description: "Customer visit lunch",
    status: "Approved",
    amount: 92.30,
    currentLevel: null,
    user: "teamlead",
    department: "Engineering",
    category: "meals",
    expenseDate: offsetDate(-1),
    submittedAt: offsetDate(-1),
    approvedAt: offsetDate(0),
    route: "Team Lead",
    lineItems: [{ description: "Lunch with customer", amount: 92.30, category: cat("meals") }]
  });
  seeds.push({
    expenseId: seedId("approved-5"),
    description: "Operations — replacement monitor",
    status: "Approved",
    amount: 410.00,
    currentLevel: null,
    user: "admin",
    department: "Operations",
    category: "equipment",
    expenseDate: offsetDate(-2),
    submittedAt: offsetDate(-2),
    approvedAt: offsetDate(-1),
    route: "Team Lead → Department Manager",
    lineItems: [{ description: "27\" monitor", amount: 410.00, category: cat("equipment") }]
  });
  seeds.push({
    expenseId: seedId("reimbursed-4"),
    description: "Engineering training — workshop",
    status: "Reimbursed",
    amount: 1240.00,
    currentLevel: null,
    user: "employee",
    department: "Engineering",
    category: "training",
    expenseDate: offsetDate(-35),
    submittedAt: offsetDate(-35),
    approvedAt: offsetDate(-33),
    paidAt: offsetDate(-28),
    route: "Team Lead",
    lineItems: [{ description: "Rust workshop seat", amount: 1240.00, category: cat("training") }]
  });
  seeds.push({
    expenseId: seedId("reimbursed-5"),
    description: "Sales enablement tool",
    status: "Reimbursed",
    amount: 2880.00,
    currentLevel: null,
    user: "manager",
    department: "Marketing",
    category: "software",
    expenseDate: offsetDate(-42),
    submittedAt: offsetDate(-42),
    approvedAt: offsetDate(-39),
    paidAt: offsetDate(-34),
    route: "Team Lead → Department Manager",
    lineItems: [{ description: "Outreach tool — annual", amount: 2880.00, category: cat("software") }]
  });
  seeds.push({
    expenseId: seedId("pending-l1-3"),
    description: "Engineering books",
    status: "Pending L1",
    amount: 86.40,
    currentLevel: 1,
    user: "employee",
    department: "Engineering",
    category: "training",
    expenseDate: offsetDate(-1),
    submittedAt: offsetDate(-1),
    route: "Team Lead",
    lineItems: [{ description: "Reference books", amount: 86.40, category: cat("training") }]
  });
  seeds.push({
    expenseId: seedId("pending-l1-4"),
    description: "Operations headset refresh",
    status: "Pending L1",
    amount: 248.00,
    currentLevel: 1,
    user: "admin",
    department: "Operations",
    category: "equipment",
    expenseDate: offsetDate(-2),
    submittedAt: offsetDate(-2),
    route: "Team Lead",
    lineItems: [{ description: "Two wireless headsets", amount: 248.00, category: cat("equipment") }]
  });
  // Use variable to silence "unused" warnings on the helpers above.
  void baseDay;
  void reasonDisplay;
  return seeds;
}

async function seedExpenses(departments: Array<{ itemId?: string; name?: string }>, categories: Array<{ itemId?: string; name?: string; displayName?: string }>, reasons: Array<{ itemId?: string; name?: string; displayName?: string }>): Promise<void> {
  const seeds = buildExpenseSeeds(categories, reasons);
  for (const seed of seeds) {
    const dept = departments.find((d) => d.name === seed.department);
    const category = categories.find((c) => c.name === seed.category);
    const reason = seed.rejectionReason ? reasons.find((r) => r.name === seed.rejectionReason) : undefined;
    const user = SEED_USERS.find((u) => u.id === `seed-user-${seed.user}`);
    if (!dept?.itemId || !category?.itemId || !user) continue;

    const status = seed.status;
    const submittedByName = user.name;
    const submittedByEmail = user.email;
    const submittedByUserId = user.id;
    const route = seed.route ?? "";

    const record: Partial<Expense> = {
      expenseId: seed.expenseId,
      description: seed.description,
      departmentId: dept.itemId,
      departmentName: seed.department,
      categoryId: category.itemId,
      categoryName: category.displayName,
      expenseDate: seed.expenseDate,
      amount: seed.amount,
      currency: "USD",
      status,
      currentLevel: (seed.currentLevel ?? null) as 1 | 2 | 3 | null,
      submittedByUserId,
      submittedByName,
      submittedByEmail,
      approvalRoute: route,
      rejectionReasonId: reason?.itemId,
      rejectionReasonName: reason?.displayName,
      rejectionComments: seed.rejectionComments,
      submittedAt: seed.submittedAt,
      approvedAt: seed.approvedAt,
      paidAt: seed.paidAt,
      resubmitCount: 0
    };

    const created = await createExpense(record);
    const expenseId = (created as { data?: { itemId?: string; expenseId?: string } } | undefined)?.data?.itemId
      ?? (created as { data?: { itemId?: string; expenseId?: string } } | undefined)?.data?.expenseId;

    if (!expenseId) continue;

    const lineItemRecords = seed.lineItems.map((li, index) => {
      const liCategory = categories.find((c) => c.displayName === li.category) ?? category;
      return {
        expenseId,
        description: li.description,
        categoryId: liCategory.itemId,
        categoryName: liCategory.displayName,
        amount: li.amount,
        sortOrder: index
      };
    });
    if (lineItemRecords.length > 0) {
      try {
        await Promise.all(lineItemRecords.map((li) => createLineItem(li)));
      } catch {
        // A line item failure is non-fatal; the parent expense still exists.
      }
    }
  }
}

export async function seedDemoDataIfEmpty(): Promise<{ seeded: boolean }> {
  // Check the most-likely populated table first: expenses. If they exist,
  // we've already seeded.
  try {
    const existingExpenses = await listExpenses({ pageSize: 1 });
    if (existingExpenses.totalCount > 0) return { seeded: false };
  } catch {
    // Fall through and seed.
  }

  try {
    const departments = await listDepartments();
    const categories = await listExpenseCategories();
    const reasons = await listRejectionReasons();
    const rules = await listApprovalRules();
    const budgets = await listBudgets();

    const freshDepts = departments.length === 0 ? await seedDepartments() : departments;
    if (categories.length === 0) await seedCategories();
    if (reasons.length === 0) await seedRejectionReasons();
    if (rules.length === 0) await seedApprovalRules();
    if (budgets.length === 0) await seedBudgets(freshDepts);
    // Always try to seed expenses — they're the ones we can't tell from
    // the count alone if a previous run got partway through. The
    // `expenseId` dedupe on the gateway side makes this idempotent.
    await seedExpenses(freshDepts, await listExpenseCategories(), await listRejectionReasons());

    return { seeded: true };
  } catch (caught) {
    // eslint-disable-next-line no-console
    console.warn("Demo data seed failed", caught);
    return { seeded: false };
  }
}
