import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const LANGUAGE_COOKIE_NAME = "boxframe-language";

/**
 * Get the current user's language preference
 * Priority: 1. DB (if logged in) -> 2. Cookie -> 3. Default "ja"
 * @returns "en" or "ja"
 */
export async function getLanguage(): Promise<"en" | "ja"> {
  const session = await auth();

  // ログイン中はDBから言語設定を取得
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { language: true },
    });

    if (user?.language) {
      return user.language as "en" | "ja";
    }
  }

  // 未ログインまたはDBに設定がない場合はCookieから取得
  const cookieStore = await cookies();
  const languageCookie = cookieStore.get(LANGUAGE_COOKIE_NAME);

  if (languageCookie?.value === "en" || languageCookie?.value === "ja") {
    return languageCookie.value;
  }

  // デフォルトは日本語
  return "ja";
}
