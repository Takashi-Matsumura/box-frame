import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AiAnalyticsClient } from "./AiAnalyticsClient";
import { aiAnalyticsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = aiAnalyticsTranslations[language];

  return {
    title: t.title,
  };
}

export default async function AiAnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const language = await getLanguage();
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";

  return (
    <div className="max-w-7xl mx-auto">
      <AiAnalyticsClient
        language={language as "en" | "ja"}
        userName={userName}
      />
    </div>
  );
}
