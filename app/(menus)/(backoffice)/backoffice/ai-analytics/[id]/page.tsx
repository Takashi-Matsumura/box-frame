import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { JobAnalysisDetailClient } from "./JobAnalysisDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobAnalysisDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const language = await getLanguage();

  return (
    <JobAnalysisDetailClient
      analysisId={id}
      language={language}
      userName={session.user.name || session.user.email || "User"}
    />
  );
}
