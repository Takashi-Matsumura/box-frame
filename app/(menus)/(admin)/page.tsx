import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
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
  const t = adminTranslations[language];

  const totalUsers = await prisma.user.count();
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const userCount = await prisma.user.count({ where: { role: "USER" } });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-card rounded-lg shadow-md p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-6">
            <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
              {t.totalUsers}
            </h3>
            <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
              {t.regularUsers}
            </h3>
            <p className="text-3xl font-bold text-foreground">{userCount}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6">
            <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
              {t.administrators}
            </h3>
            <p className="text-3xl font-bold text-foreground">{adminCount}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            {t.adminActions}
          </h2>

          <Link
            href="/users"
            className="block p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg hover:shadow-md transition"
          >
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t.manageUsers}
            </h3>
            <p className="text-muted-foreground">{t.manageUsersDesc}</p>
          </Link>

          <div className="p-6 bg-muted rounded-lg">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t.systemInfo}
            </h3>
            <div className="space-y-2 text-muted-foreground">
              <p>
                <strong>{t.database}</strong> {t.databaseValue}
              </p>
              <p>
                <strong>{t.authentication}</strong> {t.authValue}
              </p>
              <p>
                <strong>{t.provider}</strong> {t.providerValue}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
