import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EvaluationsClient from "./EvaluationsClient";

export default async function EvaluationsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // マネージャー以上のロールが必要
  const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
  if (!allowedRoles.includes(session.user?.role || "")) {
    redirect("/dashboard");
  }

  // ユーザーの言語設定を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  const language = (user?.language || "ja") as "en" | "ja";

  return (
    <EvaluationsClient
      language={language}
      userId={session.user.id}
      userRole={session.user.role}
    />
  );
}
