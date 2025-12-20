import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { DataHistoryClient } from "./DataHistoryClient";
import { dataHistoryTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = dataHistoryTranslations[language];

  return {
    title: t.title,
  };
}

export default async function DataHistoryPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <DataHistoryClient language={language as "en" | "ja"} />
    </div>
  );
}
