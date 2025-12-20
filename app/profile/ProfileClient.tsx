"use client";

import type { Role } from "@prisma/client";
import { RoleBadge } from "@/components/RoleBadge";
import type { profileTranslations } from "./translations";

type ProfileTranslations =
  | (typeof profileTranslations)["en"]
  | (typeof profileTranslations)["ja"];

interface ProfileClientProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: Role;
    lastSignInAt: Date | null;
    twoFactorEnabled: boolean;
  };
  language: "en" | "ja";
  translations: ProfileTranslations;
}

export function ProfileClient({
  user,
  language,
  translations: t,
}: ProfileClientProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-card rounded-lg shadow-md p-8">
        <div className="flex items-start gap-6 mb-8">
          {/* プロフィール画像 */}
          <div>
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {user.name}
            </h2>
            <p className="text-muted-foreground mb-3">{user.email}</p>
            <RoleBadge role={user.role} />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            {t.accountInfo}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground font-medium">{t.userId}</span>
              <span className="text-foreground">{user.id}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground font-medium">{t.name}</span>
              <span className="text-foreground">{user.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground font-medium">{t.email}</span>
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground font-medium">{t.role}</span>
              <RoleBadge role={user.role} />
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-muted-foreground font-medium">{t.lastSignIn}</span>
              <span className="text-foreground">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleString(
                      language === "ja" ? "ja-JP" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )
                  : t.never}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground font-medium">
                {t.twoFactorAuth}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.twoFactorEnabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {user.twoFactorEnabled ? t.enabled : t.disabled}
              </span>
            </div>
          </div>
        </div>

        {user.role === "USER" && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>{t.note}</strong> {t.noteMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
