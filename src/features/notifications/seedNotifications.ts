// Seed in-app notifications so the header bell, Alerts inbox, and
// dashboard "Recent Notifications" panel have something to show on first
// load. Notifications are written via the SDK's notifier.notify call --
// they go to the notifier service and surface in real time once the user
// signs in.
//
// The seed here is best-effort: any failure (e.g. notifications disabled
// at the tenant level) is swallowed, since the app continues to work
// without seeded notifications.
import { blocksClient } from "../../lib/blocks/client";

const SEED_USERS = [
  "dbdbb893-97a9-4a04-b2c8-6f003974120e", // employee
  "2c5e910d-6c38-4bfc-9101-7950c2b8d9e1", // teamlead
  "84263c9c-515d-41c4-be2d-68f95775f842", // manager
  "8c8493d5-cc67-439d-a3ec-1028779aa615", // analyst
  "ef475118-ed69-43a2-9cf0-16014b66a79e", // director
  "b3dbad91-34b1-49e3-98db-dd806e7e07db"  // admin
];

type SeedNotification = {
  userId: string;
  category: string;
  title: string;
  body: string;
};

function buildSeedNotifications(): SeedNotification[] {
  const employee = SEED_USERS[0];
  const teamLead = SEED_USERS[1];
  const manager = SEED_USERS[2];
  const analyst = SEED_USERS[3];
  const director = SEED_USERS[4];
  const admin = SEED_USERS[5];
  return [
    {
      userId: teamLead ?? "",
      category: "approval_required",
      title: "Approval required",
      body: "Erin Employee submitted “Office whiteboards” ($142.10). Awaiting your level-1 approval."
    },
    {
      userId: teamLead ?? "",
      category: "approval_required",
      title: "Approval required",
      body: "Erin Employee submitted “Engineering books” ($86.40). Awaiting your level-1 approval."
    },
    {
      userId: manager ?? "",
      category: "approval_required",
      title: "Approval required",
      body: "Tom Lead approved “Sales kickoff travel”. Awaiting your level-2 approval."
    },
    {
      userId: director ?? "",
      category: "approval_required",
      title: "Approval required",
      body: "Ana Analyst submitted “Annual SaaS renewal” ($6,800.00). Awaiting your level-3 approval."
    },
    {
      userId: employee ?? "",
      category: "expense_rejected",
      title: "Expense rejected",
      body: "“Personal flight upgrade” was rejected — Premium cabin is not covered under our travel policy."
    },
    {
      userId: manager ?? "",
      category: "budget_warning",
      title: "Budget warning",
      body: "Marketing has used 100% of its monthly budget. New submissions are blocked."
    },
    {
      userId: director ?? "",
      category: "budget_warning",
      title: "Budget warning",
      body: "Engineering has used 82% of its monthly budget."
    },
    {
      userId: admin ?? "",
      category: "expense_submitted",
      title: "Expense submitted",
      body: "Operations submitted “Operations headset refresh” ($248.00)."
    },
    {
      userId: analyst ?? "",
      category: "reimbursement_processed",
      title: "Reimbursement processed",
      body: "“Software licenses — analytics” ($1,880.00) has been reimbursed."
    }
  ];
}

export async function seedDemoNotificationsIfEmpty(): Promise<void> {
  try {
    const existing = await blocksClient.notifier.getNotifications({ pageSize: 1 });
    const total = (existing as { totalNotificationsCount?: number })?.totalNotificationsCount ?? 0;
    if (total > 0) return;
  } catch {
    return;
  }

  const seeds = buildSeedNotifications();
  for (const seed of seeds) {
    try {
      await blocksClient.notifier.notify({
        userIds: [seed.userId],
        denormalizedPayload: JSON.stringify({
          category: seed.category,
          title: seed.title,
          body: seed.body
        }),
        saveDenormalizedPayloadAsAnObject: true
      });
    } catch {
      // Notifications are a soft dependency; ignore per-record failures.
    }
  }
}

