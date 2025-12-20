import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { DashboardClient } from "./DashboardClient";
import { dashboardTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = dashboardTranslations[language];

  return {
    title: t.title,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const language = await getLanguage();
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";
  const userRole = session.user.role || "USER";

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardClient
        language={language as "en" | "ja"}
        userRole={userRole}
        userName={userName}
      />
    </div>
  );
}
