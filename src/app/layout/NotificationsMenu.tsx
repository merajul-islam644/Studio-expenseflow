import { Bell, CheckCheck } from "lucide-react";
import { useNotificationsQuery, notificationTitle, notificationBody } from "../../features/notifications/notifierHooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../shared/ui/dropdown-menu";
import { notificationCategoryLabel } from "../../features/notifications/notifierHooks";

export function NotificationsMenu({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const unread = notifications.filter((n) => !n.isRead).length;
  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="icon-button notifications-trigger" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 ? <span className="notifications-badge">{badge}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[320px] notifications-menu">
        <DropdownMenuLabel>
          <div className="notifications-menu-head">
            <span>Notifications</span>
            <span className="muted">{unread > 0 ? `${unread} unread` : "All caught up"}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="notifications-loading">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <CheckCheck size={22} className="text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No new notifications right now.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.slice(0, 6).map((item, index) => (
              <button
                key={item.itemId ?? item.id ?? index}
                type="button"
                className={["notifications-row", item.isRead ? "" : "unread"].filter(Boolean).join(" ")}
                onClick={() => onNavigate("/alerts")}
              >
                <div className="notifications-row-head">
                  <span className="notifications-category">{notificationCategoryLabel(item.category)}</span>
                  {!item.isRead ? <span className="unread-dot" aria-label="Unread" /> : null}
                </div>
                <strong className="notifications-row-title">{notificationTitle(item)}</strong>
                <span className="notifications-row-body">{notificationBody(item)}</span>
              </button>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <button type="button" className="notifications-see-all" onClick={() => onNavigate("/alerts")}>
          See all notifications
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
