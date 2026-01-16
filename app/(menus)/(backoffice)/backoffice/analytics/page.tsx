import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { BusinessAnalyticsClient } from "./BusinessAnalyticsClient";
import { businessAnalyticsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = businessAnalyticsTranslations[language];

  return {
    title: t.title,
  };
}

export default async function BusinessAnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const language = await getLanguage();
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";

  return (
    <div className="max-w-7xl mx-auto">
      <BusinessAnalyticsClient
        language={language as "en" | "ja"}
        userName={userName}
      />
    </div>
  );
}
