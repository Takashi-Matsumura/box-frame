"use client";

import { Card, CardContent } from "@/components/ui/card";
import { dashboardTranslations } from "./translations";

interface DashboardClientProps {
  language: "en" | "ja";
  userRole: string;
  userName: string;
}

export function DashboardClient({
  language,
  userRole,
  userName,
}: DashboardClientProps) {
  const t = dashboardTranslations[language];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-primary border-0">
        <CardContent className="py-6">
          <div className="flex items-center justify-between text-primary-foreground">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {t.welcomeBack}, {userName}!
              </h1>
              <p className="opacity-80">
                {t.roleLabel}: <span className="font-semibold">{userRole}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="opacity-70 text-sm">{t.today}</p>
                <p className="text-xl font-semibold">
                  {new Date().toLocaleDateString(
                    language === "ja" ? "ja-JP" : "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
