import { toast } from "sonner";
import { create } from "zustand";

export interface Notification {
  id: string;
  type: "SYSTEM" | "SECURITY" | "ACTION" | "INFO" | "WARNING" | "ERROR";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  title: string;
  titleJa?: string;
  message: string;
  messageJa?: string;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelJa?: string;
  source?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ToastNotification {
  id?: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  // 通知センターの状態
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  // ドロップダウンの開閉状態
  isOpen: boolean;
  setOpen: (open: boolean) => void;

  // 通知データ操作
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // リアルタイム更新用
  addNotification: (notification: Notification) => void;

  // トースト通知
  showToast: (toast: ToastNotification) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,
  isOpen: false,

  setOpen: (open) => set({ isOpen: open }),

  fetchNotifications: async (reset = false) => {
    const currentPage = reset ? 1 : get().page;
    set({ isLoading: true });

    try {
      const res = await fetch(
        `/api/notifications?page=${currentPage}&pageSize=20`,
      );
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();

      set((state) => ({
        notifications: reset
          ? data.notifications
          : [...state.notifications, ...data.notifications],
        hasMore: currentPage < data.totalPages,
        page: currentPage + 1,
        unreadCount: data.unreadCount,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      set({ unreadCount: data.count });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  },

  markAsRead: async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error("Failed to update");

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to update");

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  },

  deleteNotification: async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount:
            notification && !notification.isRead
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
        };
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  showToast: (toastData) => {
    const options = {
      duration: toastData.duration ?? 5000,
      action: toastData.action
        ? {
            label: toastData.action.label,
            onClick: toastData.action.onClick,
          }
        : undefined,
    };

    switch (toastData.type) {
      case "success":
        toast.success(toastData.title, {
          description: toastData.message,
          ...options,
        });
        break;
      case "error":
        toast.error(toastData.title, {
          description: toastData.message,
          ...options,
        });
        break;
      case "warning":
        toast.warning(toastData.title, {
          description: toastData.message,
          ...options,
        });
        break;
      case "info":
      default:
        toast.info(toastData.title, {
          description: toastData.message,
          ...options,
        });
        break;
    }
  },
}));
