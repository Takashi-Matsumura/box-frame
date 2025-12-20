"use client";

import { useSearchParams } from "next/navigation";
import { FaHistory, FaSitemap, FaUsers } from "react-icons/fa";
import { dataHistoryTranslations } from "./translations";

interface DataHistoryClientProps {
  language: "en" | "ja";
}

export function DataHistoryClient({ language }: DataHistoryClientProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "changes";
  const t = dataHistoryTranslations[language];

  return (
    <div className="bg-card rounded-lg shadow-md p-8">
      {tab === "changes" && <ChangeHistoryTab t={t} />}
      {tab === "employee" && <EmployeeHistoryTab t={t} />}
      {tab === "organization" && <OrganizationHistoryTab t={t} />}
    </div>
  );
}

function ChangeHistoryTab({
  t,
}: {
  t: (typeof dataHistoryTranslations)["en" | "ja"];
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FaHistory className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-foreground">
          {t.changeHistory}
        </h2>
      </div>
      <div className="text-center py-12 text-muted-foreground">
        <FaHistory className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t.noData}</p>
      </div>
    </div>
  );
}

function EmployeeHistoryTab({
  t,
}: {
  t: (typeof dataHistoryTranslations)["en" | "ja"];
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FaUsers className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold text-foreground">
          {t.employeeHistory}
        </h2>
      </div>
      <div className="text-center py-12 text-muted-foreground">
        <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t.noData}</p>
      </div>
    </div>
  );
}

function OrganizationHistoryTab({
  t,
}: {
  t: (typeof dataHistoryTranslations)["en" | "ja"];
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FaSitemap className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-foreground">
          {t.organizationHistory}
        </h2>
      </div>
      <div className="text-center py-12 text-muted-foreground">
        <FaSitemap className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t.noData}</p>
      </div>
    </div>
  );
}
