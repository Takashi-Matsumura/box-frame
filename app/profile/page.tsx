import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";
import { profileTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = profileTranslations[language];

  return {
    title: t.title,
  };
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = await getLanguage();
  const t = profileTranslations[language];

  // Get user's lastSignInAt and twoFactorEnabled
  const user = await prisma.user.findUnique({
    where: { email: session.user.email ?? "" },
    select: { lastSignInAt: true, twoFactorEnabled: true },
  });

  return (
    <ProfileClient
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: session.user.role,
        lastSignInAt: user?.lastSignInAt ?? null,
        twoFactorEnabled: user?.twoFactorEnabled ?? false,
      }}
      language={language}
      translations={t}
    />
  );
}
