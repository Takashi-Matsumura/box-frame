export const verifyTotpTranslations = {
  en: {
    title: "Two-Factor Authentication",
    subtitle: "Enter the 6-digit code from your authenticator app",
    codeLabel: "Verification Code",
    codePlaceholder: "000000",
    verifyButton: "Verify",
    verifying: "Verifying...",
    invalidCode: "Invalid verification code. Please try again.",
    error: "An error occurred. Please try again.",
    logout: "Logout",
  },
  ja: {
    title: "二要素認証",
    subtitle: "認証アプリの6桁のコードを入力してください",
    codeLabel: "認証コード",
    codePlaceholder: "000000",
    verifyButton: "認証",
    verifying: "認証中...",
    invalidCode: "認証コードが正しくありません。再度入力してください。",
    error: "エラーが発生しました。再度お試しください。",
    logout: "ログアウト",
  },
} as const;
