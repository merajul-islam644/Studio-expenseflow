import { useMemo, useState } from "react";
import { CheckCheck, Filter } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import {
  notificationBody,
  notificationCategoryLabel,
  notificationTitle,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery
} from "./notifierHooks";
import { formatDateTime } from "../expenses/types";

const CATEGORY_FILTERS = [
  "all",
  "approval_required",
  "expense_approved",
  "expense_rejected",
  "budget_warning",
  "budget_blocked",
  "expense_submitted",
  "reimbursement_processed"
];

export function AlertsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<string>("all");
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const filtered = useMemo(() => {
    let items = notifications;
    if (tab === "unread") items = items.filter((n) => !n.isRead);
    if (category !== "all") items = items.filter((n) => n.category === category);
    return items;
  }, [notifications, tab, category]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <section>
      <PageHeader
        title={t("alerts.title")}
        subtitle={t("alerts.subtitle")}
        actions={
          <button
            className="secondary-button"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck size={16} /> {t("alerts.markAllRead")}
          </button>
        }
      />

      <div className="alerts-tabs">
        <button type="button" className={["tab", tab === "all" ? "active" : ""].join(" ")} onClick={() => setTab("all")}>
          {t("alerts.tabs.all")} ({notifications.length})
        </button>
        <button type="button" className={["tab", tab === "unread" ? "active" : ""].join(" ")} onClick={() => setTab("unread")}>
          {t("alerts.tabs.unread")} ({unreadCount})
        </button>
      </div>

      <div className="toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
          <select className="search-input" style={{ width: 220 }} value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORY_FILTERS.map((entry) => (
              <option key={entry} value={entry}>
                {entry === "all" ? t("alerts.categories.all") : notificationCategoryLabel(entry)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="panel"><Skeleton className="skeleton-line-lg" /><Skeleton className="skeleton-line" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("alerts.empty.title")}
          description={t("alerts.empty.description")}
          icon={<CheckCheck size={28} />}
        />
      ) : (
        <div className="card-stack">
          {filtered.map((item, index) => (
            <button
              type="button"
              key={item.itemId ?? item.id ?? index}
              className={["alert-item", !item.isRead ? "unread" : ""].filter(Boolean).join(" ")}
              onClick={() => {
                if (item.itemId && !item.isRead) markRead.mutate(item.itemId);
              }}
            >
              <div className="alert-item-head">
                <span className="alert-item-title">{notificationTitle(item)}</span>
                <span className="alert-item-meta">{notificationCategoryLabel(item.category)}</span>
              </div>
              <p className="alert-item-body">{notificationBody(item)}</p>
              <span className="alert-item-meta">{formatDateTime(item.createdDate ?? item.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
