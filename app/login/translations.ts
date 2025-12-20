export const loginTranslations = {
  en: {
    or: "OR",
  },
  ja: {
    or: "または",
  },
} as const;

export type LoginTranslationKey = keyof typeof loginTranslations.en;
