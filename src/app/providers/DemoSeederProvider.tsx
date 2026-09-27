// One-shot seeder hook. The first authenticated load sees no departments
// and no expenses in the gateway, so this triggers a single demo-data
// pass and then never runs again. The seed itself is idempotent on the
// gateway side (records carry stable IDs), so a re-run mid-bootstrap
// is safe.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { seedDemoDataIfEmpty } from "../../features/expenses/seed";
import { seedDemoNotificationsIfEmpty } from "../../features/notifications/seedNotifications";
import { useAuth } from "../providers/AuthProvider";

const SEED_FLAG = "expenseflow:demo-seeded";

export function useDemoSeeder() {
  const { status } = useAuth();
  const [seeded, setSeeded] = useState(() => sessionStorage.getItem(SEED_FLAG) === "true");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (seeded) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await seedDemoDataIfEmpty();
        await seedDemoNotificationsIfEmpty();
        if (!cancelled) {
          sessionStorage.setItem(SEED_FLAG, "true");
          setSeeded(true);
          // Invalidate every affected query so any page already mounted
          // picks up the freshly-seeded records.
          await queryClient.invalidateQueries();
          void result;
        }
      } catch {
        if (!cancelled) {
          // Even on failure, mark as "attempted" so we don't loop forever
          // on a permanent error. The next reload can retry.
          sessionStorage.setItem(SEED_FLAG, "true");
          setSeeded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [status, seeded, queryClient]);

  return seeded;
}
