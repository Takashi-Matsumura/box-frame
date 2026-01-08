import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
import { DataManagementClient } from "./DataManagementClient";
import { dataManagementTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = dataManagementTranslations[language];

  return {
    title: t.title,
  };
}

export default async function DataManagementPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  // 組織一覧を取得
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { employees: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <DataManagementClient
        language={language as "en" | "ja"}
        organizations={organizations}
      />
    </div>
  );
}
