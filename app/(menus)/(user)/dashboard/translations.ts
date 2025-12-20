export const dashboardTranslations = {
  en: {
    title: "Dashboard",
    welcomeBack: "Welcome back",
    roleLabel: "Role",
    today: "Today",
  },
  ja: {
    title: "ダッシュボード",
    welcomeBack: "お帰りなさい",
    roleLabel: "ロール",
    today: "今日",
  },
} as const;

export type DashboardTranslationKey = keyof typeof dashboardTranslations.en;
