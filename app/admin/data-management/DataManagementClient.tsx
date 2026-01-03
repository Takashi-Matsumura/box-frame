"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaUpload, FaUsers, FaHistory, FaPlus, FaSitemap } from "react-icons/fa";
import { dataManagementTranslations } from "./translations";
import { ImportTab } from "./components/ImportTab";
import { EmployeesTab } from "./components/EmployeesTab";
import { HistoryTab } from "./components/HistoryTab";
import { OrganizeTab } from "./components/OrganizeTab";

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

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.push(`?${params.toString()}`);
  };

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

  const tabs = [
    { id: "import", label: t.import, icon: FaUpload },
    { id: "employees", label: t.employees, icon: FaUsers },
    { id: "organize", label: t.organize, icon: FaSitemap },
    { id: "history", label: t.history, icon: FaHistory },
  ];

  return (
    <div className="bg-card rounded-lg shadow-md">
      {/* Organization Selector */}
      <div className="border-b border-border p-4">
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
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
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

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 px-4">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => handleTabChange(tabItem.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tabItem.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
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
      </div>
    </div>
  );
}
