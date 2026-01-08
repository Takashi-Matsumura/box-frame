import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { getAllMenus, getEnabledModules } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { AdminClient } from "./AdminClient";
import { adminTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = adminTranslations[language];

  return {
    title: t.title,
  };
}

export default async function AdminPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  // 統計情報を取得
  const totalUsers = await prisma.user.count();
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const userCount = await prisma.user.count({ where: { role: "USER" } });

  // アクセスキー関連のデータを取得
  const accessKeys = await prisma.accessKey.findMany({
    include: {
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          userAccessKeys: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 全ユーザを取得（管理者自身を除く）
  const users = await prisma.user.findMany({
    where: {
      id: {
        not: session.user.id,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // ADMINメニューグループを除く全メニューを取得
  const allMenus = getAllMenus();
  const menus = allMenus.filter(
    (menu) => menu.menuGroup.toLowerCase() !== "admin",
  );

  // モジュール一覧を取得
  const modules = getEnabledModules();

  return (
    <AdminClient
      language={language}
      currentUserId={session.user.id}
      initialStats={{
        totalUsers,
        adminCount,
        userCount,
      }}
      accessKeys={accessKeys}
      users={users}
      menus={menus}
      modules={modules}
    />
  );
}
