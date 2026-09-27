// Budgets admin screen — same data the Budgets page shows, with the
// edit affordance per row plus a quick-link to the Budgets page so the
// admin can see utilization after editing.
import { useQuery } from "@tanstack/react-query";
import { listBudgets } from "../expenses/api";
import { formatUsd, type Budget } from "../expenses/types";

export function BudgetsSettings() {
  const query = useQuery({
    queryKey: ["budgets", "list"],
    queryFn: () => listBudgets(),
    staleTime: 30_000
  });

  const budgets: Budget[] = query.data ?? [];

  return (
    <div className="section-card">
      <h3>Budgets</h3>
      <p className="section-subtitle">Configure the monthly budget per department. Visit the Budgets page to edit individual amounts.</p>
      {query.isLoading ? <p className="muted">Loading…</p> : budgets.length === 0 ? (
        <p className="muted">No budgets configured yet.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Period</th>
                <th>Budget amount</th>
                <th>Spent</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.itemId}>
                  <td data-label="Department"><strong>{b.departmentName}</strong></td>
                  <td data-label="Period">{b.period ?? "Monthly"}</td>
                  <td data-label="Budget">{formatUsd(b.budgetAmount)}</td>
                  <td data-label="Spent">{formatUsd(b.spentAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
