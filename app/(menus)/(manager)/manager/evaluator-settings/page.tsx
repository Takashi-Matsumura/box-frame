import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EvaluatorSettingsClient from "./EvaluatorSettingsClient";

export default async function EvaluatorSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Manager以上のロールが必要
  const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
  if (!allowedRoles.includes(session.user?.role || "")) {
    redirect("/dashboard");
  }

  // ユーザーの言語設定とメールアドレスから社員情報を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, email: true },
  });

  const language = (user?.language || "ja") as "en" | "ja";
  const userRole = session.user.role as "MANAGER" | "EXECUTIVE" | "ADMIN";

  // MANAGERの場合、部門情報を取得
  let userDepartmentId: string | null = null;
  let userSectionId: string | null = null;
  if (userRole !== "ADMIN" && user?.email) {
    const employee = await prisma.employee.findUnique({
      where: { email: user.email },
      select: { departmentId: true, sectionId: true },
    });
    userDepartmentId = employee?.departmentId || null;
    userSectionId = employee?.sectionId || null;
  }

  return (
    <EvaluatorSettingsClient
      language={language}
      userId={session.user.id}
      userRole={userRole}
      userDepartmentId={userDepartmentId}
      userSectionId={userSectionId}
    />
  );
}
