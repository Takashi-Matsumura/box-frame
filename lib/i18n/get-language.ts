import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Get the current user's language preference
 * @returns "en" or "ja"
 */
export async function getLanguage(): Promise<"en" | "ja"> {
  const session = await auth();

  if (!session?.user?.email) {
    return "ja";
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { language: true },
  });

  return (user?.language as "en" | "ja") || "ja";
}
