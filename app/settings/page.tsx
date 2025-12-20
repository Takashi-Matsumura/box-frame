import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";
import { settingsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = settingsTranslations[language];

  return {
    title: t.title,
  };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = await getLanguage();
  const t = settingsTranslations[language];

  // Get user's 2FA status and LDAP mapping
  const user = await prisma.user.findUnique({
    where: { email: session.user.email ?? "" },
    select: {
      twoFactorEnabled: true,
      ldapMappings: {
        select: {
          mustChangePassword: true,
        },
        take: 1,
      },
    },
  });

  // Check if this is an OpenLDAP user (has at least one LDAP mapping)
  const ldapMapping = user?.ldapMappings?.[0];
  const isLdapUser = !!ldapMapping;
  const mustChangePassword = ldapMapping?.mustChangePassword ?? false;

  return (
    <SettingsClient
      language={language}
      translations={t}
      twoFactorEnabled={user?.twoFactorEnabled ?? false}
      isLdapUser={isLdapUser}
      mustChangePassword={mustChangePassword}
    />
  );
}
