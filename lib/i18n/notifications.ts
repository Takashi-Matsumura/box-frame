export const notificationTranslations = {
  en: {
    // Header
    title: "Notifications",
    markAllRead: "Mark all as read",
    loadMore: "Load more",
    loading: "Loading...",
    noNotifications: "No notifications",
    noNotificationsDescription:
      "You're all caught up! Check back later for new notifications.",

    // Notification types
    types: {
      SYSTEM: "System",
      SECURITY: "Security",
      ACTION: "Action Required",
      INFO: "Information",
      WARNING: "Warning",
      ERROR: "Error",
    },

    // Priorities
    priorities: {
      LOW: "Low",
      NORMAL: "Normal",
      HIGH: "High",
      URGENT: "Urgent",
    },

    // Actions
    delete: "Delete",
    viewAll: "View all notifications",

    // Time
    justNow: "Just now",

    // Errors
    fetchError: "Failed to load notifications",
    updateError: "Failed to update notification",
  },
  ja: {
    // Header
    title: "通知",
    markAllRead: "すべて既読にする",
    loadMore: "もっと読み込む",
    loading: "読み込み中...",
    noNotifications: "通知はありません",
    noNotificationsDescription:
      "新しい通知はありません。また後で確認してください。",

    // Notification types
    types: {
      SYSTEM: "システム",
      SECURITY: "セキュリティ",
      ACTION: "要対応",
      INFO: "お知らせ",
      WARNING: "警告",
      ERROR: "エラー",
    },

    // Priorities
    priorities: {
      LOW: "低",
      NORMAL: "通常",
      HIGH: "高",
      URGENT: "緊急",
    },

    // Actions
    delete: "削除",
    viewAll: "すべての通知を見る",

    // Time
    justNow: "たった今",

    // Errors
    fetchError: "通知の読み込みに失敗しました",
    updateError: "通知の更新に失敗しました",
  },
} as const;

export type NotificationTranslations =
  (typeof notificationTranslations)["en"];
export type Language = keyof typeof notificationTranslations;
