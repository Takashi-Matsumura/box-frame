import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLanguage } from "@/lib/i18n/get-language";
import { OrganizationChartClient } from "./OrganizationChartClient";
import type { Language } from "./translations";

export default async function OrganizationChartPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;

  return <OrganizationChartClient language={language} />;
}
