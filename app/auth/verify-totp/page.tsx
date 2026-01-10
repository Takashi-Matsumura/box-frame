import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { verifyTotpTranslations } from "./translations";
import { VerifyTotpClient } from "./VerifyTotpClient";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = verifyTotpTranslations[language];

  return {
    title: t.title,
  };
}

export default async function VerifyTotpPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect to dashboard if 2FA is not enabled
  if (!session.user.twoFactorEnabled) {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return <VerifyTotpClient language={language as "en" | "ja"} />;
}
