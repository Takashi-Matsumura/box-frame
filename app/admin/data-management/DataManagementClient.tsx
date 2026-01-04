"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaPlus, FaUsers } from "react-icons/fa";
import { dataManagementTranslations } from "./translations";
import { ImportTab } from "./components/ImportTab";
import { EmployeesTab } from "./components/EmployeesTab";
import { HistoryTab } from "./components/HistoryTab";
import { OrganizeTab } from "./components/OrganizeTab";
import { Card, CardContent } from "@/components/ui/card";

interface Organization {
  id: string;
  name: string;
  _count: {
    employees: number;
  };
}

interface DataManagementClientProps {
  language: "en" | "ja";
  organizations: Organization[];
}

export function DataManagementClient({
  language,
  organizations,
}: DataManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "import";
  const t = dataManagementTranslations[language];

  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    organizations[0]?.id || ""
  );
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    try {
      const response = await fetch("/api/admin/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });

      if (response.ok) {
        const { organization } = await response.json();
        setSelectedOrgId(organization.id);
        setNewOrgName("");
        setShowCreateOrg(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Card>
        <CardContent className="p-6">
          {/* Organization Selector */}
          <div className="border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">
                {t.selectOrganization}:
              </label>
              {organizations.length > 0 ? (
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org._count.employees}名)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {t.noOrganization}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowCreateOrg(!showCreateOrg)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                {t.createOrganization}
              </button>
            </div>

            {/* Create Organization Form */}
            {showCreateOrg && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder={t.organizationName}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateOrganization}
                    disabled={isCreatingOrg || !newOrgName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingOrg ? t.loading : t.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateOrg(false);
                      setNewOrgName("");
                    }}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {!selectedOrgId && organizations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t.noOrganization}</p>
            </div>
          ) : (
            <>
              {tab === "import" && (
                <ImportTab
                  organizationId={selectedOrgId}
                  language={language}
                  t={t}
                />
              )}
              {tab === "employees" && (
                <EmployeesTab
                  organizationId={selectedOrgId}
                  language={language}
                  t={t}
                />
              )}
              {tab === "organize" && (
                <OrganizeTab
                  organizationId={selectedOrgId}
                  language={language}
                  t={t}
                />
              )}
              {tab === "history" && (
                <HistoryTab
                  organizationId={selectedOrgId}
                  language={language}
                  t={t}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
