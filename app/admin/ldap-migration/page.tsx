import { getLanguage } from "@/lib/i18n/get-language";
import { LdapMigrationClient } from "./LdapMigrationClient";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LdapMigrationPage({ searchParams }: PageProps) {
  const language = await getLanguage();
  const params = await searchParams;
  const tab =
    (params.tab as "settings" | "test" | "stats") || "settings";

  return <LdapMigrationClient language={language} tab={tab} />;
}
