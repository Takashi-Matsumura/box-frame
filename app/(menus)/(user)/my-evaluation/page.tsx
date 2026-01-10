import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MyEvaluationClient from "./MyEvaluationClient";

export default async function MyEvaluationPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // ユーザーの言語設定を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  const language = (user?.language || "ja") as "en" | "ja";

  return <MyEvaluationClient language={language} userId={session.user.id} />;
}
