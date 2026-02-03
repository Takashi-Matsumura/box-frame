/**
 * カレンダーモジュール
 *
 * スケジュール関連機能を提供するモジュール
 * - チームスケジュール（マネージャー向け）
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const calendarModule: AppModule = {
  id: "calendar",
  name: "Calendar",
  nameJa: "カレンダー",
  description: "Schedule management for teams and individuals",
  descriptionJa: "チームと個人のスケジュール管理",
  icon: getModuleIcon("schedule"),
  enabled: true,
  order: 25,
  dependencies: ["organization"],
  menus: [
    {
      id: "teamSchedule",
      moduleId: "calendar",
      name: "Team Schedule",
      nameJa: "チームスケジュール",
      path: "/manager/team-schedule",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 10,
      icon: getMenuIcon("teamSchedule", "calendar"),
      description: "View merged schedules of your team members",
      descriptionJa: "チームメンバーのスケジュールをマージして表示",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "teamScheduleService",
      moduleId: "calendar",
      name: "Team Schedule Service",
      nameJa: "チームスケジュールサービス",
      description: "Provides team schedule data for managers",
      descriptionJa: "マネージャー向けチームスケジュールデータを提供",
      apiEndpoints: ["/api/calendar/team-schedule"],
      enabled: true,
    },
  ],
};
