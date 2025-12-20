import enMessages from "@/messages/en.json";
import jaMessages from "@/messages/ja.json";

export function getTranslations(language: string) {
  return language === "ja" ? jaMessages : enMessages;
}

export type Translations = typeof enMessages;
