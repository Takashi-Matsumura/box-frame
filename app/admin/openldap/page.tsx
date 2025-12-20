import { getLanguage } from "@/lib/i18n/get-language";
import { OpenLdapManagementClient } from "./OpenLdapManagementClient";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function OpenLdapManagementPage({
  searchParams,
}: PageProps) {
  const language = await getLanguage();
  const params = await searchParams;
  const tab =
    (params.tab as "users" | "accesskeys" | "migration" | "settings") ||
    "users";

  return <OpenLdapManagementClient language={language} tab={tab} />;
}
