// Notifier hooks: read the signed-in user's notifications, unread count,
// and provide mutation helpers. Backed by blocksClient.notifier (the
// Blocks notifier service), not in-app state -- notifications persist
// across sessions and devices.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";

export type AppNotification = {
  itemId?: string;
  id?: string;
  category?: string;
  title?: string;
  body?: string;
  message?: string;
  isRead?: boolean;
  createdDate?: string;
  createdAt?: string;
  userId?: string;
};

function normalizeNotifications(raw: unknown): AppNotification[] {
  const record = raw as {
    notifications?: Array<Record<string, unknown>>;
    data?: { notifications?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> };
    items?: Array<Record<string, unknown>>;
  } | undefined;
  const items = (record?.notifications ?? record?.data?.notifications ?? record?.data?.items ?? record?.items ?? []) as Array<Record<string, unknown>>;
  return items.map((raw): AppNotification => {
    // The notifier service stores the payload as a JSON-encoded string.
    let category: string | undefined;
    let title: string | undefined;
    let body: string | undefined;
    const rawPayload = raw.denormalizedPayload ?? raw.payload;
    if (typeof rawPayload === "string") {
      try {
        const parsed = JSON.parse(rawPayload);
        if (parsed && typeof parsed === "object") {
          category = typeof parsed.category === "string" ? parsed.category : undefined;
          title = typeof parsed.title === "string" ? parsed.title : undefined;
          body = typeof parsed.body === "string" ? parsed.body : undefined;
        }
      } catch {
        // ignore JSON parse errors, the payload may not be JSON
      }
    } else if (rawPayload && typeof rawPayload === "object") {
      const obj = rawPayload as Record<string, unknown>;
      category = typeof obj.category === "string" ? obj.category : undefined;
      title = typeof obj.title === "string" ? obj.title : undefined;
      body = typeof obj.body === "string" ? obj.body : undefined;
    }
    const id = typeof raw.id === "string" ? raw.id : (raw.correlationId as string | undefined);
    return {
      itemId: id,
      id,
      category,
      title,
      body,
      message: typeof raw.message === "string" ? raw.message : undefined,
      isRead: Boolean(raw.isRead),
      createdDate: typeof raw.createdTime === "string" ? raw.createdTime : undefined,
      createdAt: typeof raw.createdTime === "string" ? raw.createdTime : undefined,
      userId: typeof raw.userId === "string" ? raw.userId : undefined
    };
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryFn: async () => {
      const response = await blocksClient.notifier.getNotifications({ pageSize: 50 });
      return normalizeNotifications(response);
    },
    queryKey: ["notifications", "list"]
  });
}

export function useUnreadNotificationsQuery() {
  return useQuery({
    queryFn: async () => {
      const response = await blocksClient.notifier.getNotifications({ isUnreadOnly: true, pageSize: 50 });
      return normalizeNotifications(response);
    },
    queryKey: ["notifications", "unread"]
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await blocksClient.notifier.markNotificationAsRead({ id });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await blocksClient.notifier.markAllNotificationAsRead();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}

export function useNotify() {
  return useMutation({
    mutationFn: async (request: Parameters<typeof blocksClient.notifier.notify>[0]) => {
      return blocksClient.notifier.notify(request);
    }
  });
}

export function notificationTitle(item: AppNotification): string {
  if (item.title) return item.title;
  if (item.message) return item.message;
  if (item.category) return item.category.replace(/_/g, " ");
  return "Notification";
}

export function notificationBody(item: AppNotification): string {
  if (item.body) return item.body;
  if (item.message && item.title) return item.message;
  if (item.category) return `New ${item.category.replace(/_/g, " ")} notification.`;
  return "";
}

export function notificationCategoryLabel(category: string | undefined): string {
  if (!category) return "General";
  return category
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

