import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
import { ProceduresPageClient } from "./ProceduresPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const process = await prisma.businessProcess.findUnique({
    where: { id },
    select: { title: true },
  });

  const language = await getLanguage();
  const title = language === "ja" ? "作業手順書" : "Work Procedures";

  return {
    title: process ? `${title} - ${process.title}` : title,
  };
}

export default async function ProceduresPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const { id } = await params;
  const language = await getLanguage();

  // プロセスの存在確認
  const process = await prisma.businessProcess.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      diagramXml: true,
      jobDescriptionMd: true,
    },
  });

  if (!process) {
    redirect("/backoffice/analytics");
  }

  // 業務フロー図がない場合は詳細ページにリダイレクト
  if (!process.diagramXml) {
    redirect(`/backoffice/analytics/${id}`);
  }

  return (
    <ProceduresPageClient
      processId={id}
      processTitle={process.title}
      diagramXml={process.diagramXml}
      jobDescriptionMd={process.jobDescriptionMd}
      language={language as "en" | "ja"}
    />
  );
}
