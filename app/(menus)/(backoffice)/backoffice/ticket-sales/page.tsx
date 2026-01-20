import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import TicketSalesClient from "./TicketSalesClient";
import { ticketSalesTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = ticketSalesTranslations[language];

  return {
    title: t.pageTitle,
  };
}

export default async function TicketSalesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = await getLanguage();

  return <TicketSalesClient language={language} />;
}
