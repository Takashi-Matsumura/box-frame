import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserAccessKeyPermissions } from "@/lib/access-keys";
import { checkAccess } from "@/lib/auth/access-checker";
import { prisma } from "@/lib/prisma";
import EvaluationMasterClient from "./EvaluationMasterClient";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function EvaluationMasterPage({
  searchParams,
}: PageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // ロールまたはアクセスキーによるアクセス権限をチェック
  const hasAccess = await checkAccess(session, "/admin/evaluation-master", [
    "ADMIN",
  ]);
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const currentTab = params.tab || "periods";

  // ADMINロール以外の場合、許可されたタブをチェック
  if (session.user.role !== "ADMIN") {
    const accessKeyPermissions = await getUserAccessKeyPermissions(
      session.user.id,
    );
    const allowedTabIds =
      accessKeyPermissions.tabPermissions["/admin/evaluation-master"];

    // タブレベルの権限がある場合のみチェック
    if (allowedTabIds && allowedTabIds.length > 0) {
      // 現在のタブが許可されていない場合、許可された最初のタブにリダイレクト
      if (!allowedTabIds.includes(currentTab)) {
        redirect(`/admin/evaluation-master?tab=${allowedTabIds[0]}`);
      }
    }
  }

  // ユーザーの言語設定を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  const language = (user?.language || "ja") as "en" | "ja";

  return <EvaluationMasterClient language={language} />;
}
