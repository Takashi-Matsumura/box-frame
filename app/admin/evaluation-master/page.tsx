import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EvaluationMasterClient from "./EvaluationMasterClient";

export default async function EvaluationMasterPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // ユーザーの言語設定を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  const language = (user?.language || "ja") as "en" | "ja";

  return <EvaluationMasterClient language={language} />;
}
