import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const subwindowDemoModule: AppModule = {
  id: "subwindow-demo",
  name: "Sub Window Demo",
  nameJa: "サブウィンドウデモ",
  description: "Floating sub window demonstration for testing",
  descriptionJa:
    "フローティングサブウィンドウのデモンストレーション（テスト用）",
  icon: getModuleIcon("default"),
  enabled: true,
  order: 999,
  menus: [
    {
      id: "subwindowDemo",
      moduleId: "subwindow-demo",
      name: "Sub Window Demo",
      nameJa: "サブウィンドウデモ",
      path: "/admin/subwindow-demo",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 999,
      icon: getMenuIcon("subwindowDemo", "subwindow-demo"),
      description: "Floating sub window demonstration",
      descriptionJa: "フローティングサブウィンドウのデモンストレーション",
      isImplemented: true,
    },
  ],
};
