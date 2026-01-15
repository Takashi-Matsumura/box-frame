import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { ClientLayout } from "@/components/ClientLayout";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import {
  type AccessKeyPermissions,
  getUserAccessKeyPermissions,
} from "@/lib/access-keys";
import { appConfig } from "@/lib/config/app";
import {
  getAccessibleMenus,
  groupMenusByMenuGroup,
} from "@/lib/modules/access-control";
import { getAllModules, menuGroups } from "@/lib/modules/registry";
import { getUserPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AppMenu, MenuGroup } from "@/types/module";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  let userPermissions: string[] = [];
  let language = "en";
  let accessibleMenus: AppMenu[] = [];
  let groupedMenus: Record<string, AppMenu[]> = {};
  let sortedMenuGroups: MenuGroup[] = [];
  let mustChangePassword = false;
  let accessKeyPermissions: AccessKeyPermissions = {
    menuPaths: [],
    tabPermissions: {},
  };

  if (session) {
    const [permissions, user, fetchedAccessKeyPermissions] = await Promise.all([
      getUserPermissions(session.user.id),
      prisma.user.findUnique({
        where: { email: session.user.email || "" },
        select: {
          id: true,
          language: true,
          email: true,
          ldapMappings: {
            select: { mustChangePassword: true },
            take: 1,
          },
        },
      }),
      getUserAccessKeyPermissions(session.user.id),
    ]);

    userPermissions = permissions;
    language = user?.language || "en";
    accessKeyPermissions = fetchedAccessKeyPermissions;
    mustChangePassword = user?.ldapMappings?.[0]?.mustChangePassword ?? false;

    // Module Registryから全モジュールを取得
    const allModules = await getAllModules();

    // 全モジュールからメニューを抽出
    const allMenus = allModules.flatMap((module) => {
      if (!module.enabled) {
        return [];
      }

      return module.menus
        .filter((menu) => menu.enabled)
        .map((menu) => {
          const processedChildren = menu.children?.map((child) => ({
            ...child,
            icon: child.icon || module.icon,
          }));

          return {
            ...menu,
            icon: menu.icon || module.icon,
            children: processedChildren,
          };
        });
    });

    // ユーザがアクセス可能なメニューをフィルタリング
    accessibleMenus = getAccessibleMenus(
      allMenus,
      session.user.role,
      userPermissions,
      undefined,
      undefined,
    );

    // Access Keyで許可されたメニューを追加
    const roleBasedMenuPaths = new Set(accessibleMenus.map((m) => m.path));

    const accessKeyMenuList = allMenus.filter((menu) =>
      accessKeyPermissions.menuPaths.includes(menu.path),
    );

    for (const menu of accessKeyMenuList) {
      if (!roleBasedMenuPaths.has(menu.path)) {
        accessibleMenus.push({
          ...menu,
          isAccessKeyGranted: true,
        });
      }
    }

    // メニューグループごとにメニューをグループ化
    groupedMenus = groupMenusByMenuGroup(accessibleMenus);

    // 表示するメニューグループを抽出してソート
    // groupedMenusに含まれるグループはすべて表示（アクセスキー許可分を含む）
    const activeGroupIds = Object.keys(groupedMenus);
    sortedMenuGroups = Object.values(menuGroups)
      .filter((group) => activeGroupIds.includes(group.id))
      .sort((a, b) => a.order - b.order);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientLayout
            session={session}
            userPermissions={userPermissions}
            language={language}
            accessibleMenus={accessibleMenus}
            groupedMenus={groupedMenus}
            menuGroups={sortedMenuGroups}
            mustChangePassword={mustChangePassword}
          >
            <Header
              session={session}
              language={language}
              accessKeyTabPermissions={accessKeyPermissions.tabPermissions}
            />
            <main
              className={`container mx-auto px-4 py-8 ${session ? "pt-24" : "pt-20"}`}
            >
              {children}
            </main>
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
