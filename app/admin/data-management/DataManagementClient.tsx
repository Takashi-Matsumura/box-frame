"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { FaPlus, FaUsers } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeesTab } from "./components/EmployeesTab";
import { HistoryTab } from "./components/HistoryTab";
import { ImportTab } from "./components/ImportTab";
import { OrganizeTab } from "./components/OrganizeTab";
import { dataManagementTranslations } from "./translations";

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

  // 社員数が最も多い組織をマージ先（メイン）とみなす
  const primaryOrgId =
    organizations.length > 0
      ? organizations.reduce((max, org) =>
          org._count.employees > max._count.employees ? org : max
        ).id
      : "";

  const [selectedOrgId, setSelectedOrgId] = useState<string>(primaryOrgId);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);
  const [deleteOrgConfirmText, setDeleteOrgConfirmText] = useState("");
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const canDeleteOrg = selectedOrg && selectedOrg._count.employees === 0;

  const handleDeleteOrganization = async () => {
    if (deleteOrgConfirmText !== "DELETE" || !selectedOrgId) return;

    setIsDeletingOrg(true);
    setDeleteOrgError(null);

    try {
      const response = await fetch(`/api/admin/organization?id=${selectedOrgId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setShowDeleteOrgDialog(false);
        setDeleteOrgConfirmText("");
        const remaining = organizations.filter((o) => o.id !== selectedOrgId);
        if (remaining.length > 0) {
          setSelectedOrgId(remaining[0].id);
        } else {
          setSelectedOrgId("");
        }
        router.refresh();
      } else {
        setDeleteOrgError(result.error || (language === "ja" ? "削除に失敗しました" : "Deletion failed"));
      }
    } catch {
      setDeleteOrgError(language === "ja" ? "ネットワークエラーが発生しました" : "Network error occurred");
    } finally {
      setIsDeletingOrg(false);
    }
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
                      {org.id === primaryOrgId ? "★ " : ""}
                      {org.name} ({org._count.employees}名)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {t.noOrganization}
                </span>
              )}
              {selectedOrgId && canDeleteOrg && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteOrgDialog(true);
                    setDeleteOrgConfirmText("");
                    setDeleteOrgError(null);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors"
                  title={language === "ja" ? "組織を削除" : "Delete Organization"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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
          {tab === "import" && (
            <ImportTab
              organizationId={selectedOrgId}
              language={language}
              t={t}
            />
          )}
          {tab === "employees" &&
            (!selectedOrgId ? (
              <div className="text-center py-12 text-muted-foreground">
                <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t.noOrganization}</p>
              </div>
            ) : (
              <EmployeesTab
                organizationId={selectedOrgId}
                language={language}
                t={t}
                primaryOrgId={primaryOrgId}
                primaryOrgName={
                  organizations.find((o) => o.id === primaryOrgId)?.name || ""
                }
              />
            ))}
          {tab === "organize" &&
            (!selectedOrgId ? (
              <div className="text-center py-12 text-muted-foreground">
                <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t.noOrganization}</p>
              </div>
            ) : (
              <OrganizeTab
                organizationId={selectedOrgId}
                language={language}
                t={t}
              />
            ))}
          {tab === "history" &&
            (!selectedOrgId ? (
              <div className="text-center py-12 text-muted-foreground">
                <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t.noOrganization}</p>
              </div>
            ) : (
              <HistoryTab
                organizationId={selectedOrgId}
                language={language}
                t={t}
              />
            ))}
        </CardContent>
      </Card>

      {/* 組織削除確認モーダル */}
      {showDeleteOrgDialog &&
        createPortal(
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10000]">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
                {language === "ja" ? "組織の削除" : "Delete Organization"}
              </h3>

              <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  {language === "ja"
                    ? "警告: この操作は元に戻せません！"
                    : "Warning: This action cannot be undone!"}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {language === "ja"
                    ? `「${selectedOrg?.name}」の組織レコードを完全に削除します。`
                    : `The organization record "${selectedOrg?.name}" will be permanently deleted.`}
                </p>
              </div>

              {deleteOrgError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    {deleteOrgError}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  {language === "ja"
                    ? "確認のため「DELETE」と入力してください："
                    : 'Type "DELETE" to confirm:'}
                </label>
                <input
                  type="text"
                  value={deleteOrgConfirmText}
                  onChange={(e) => setDeleteOrgConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-background"
                  placeholder="DELETE"
                  disabled={isDeletingOrg}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteOrgDialog(false);
                    setDeleteOrgConfirmText("");
                    setDeleteOrgError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-50"
                  disabled={isDeletingOrg}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleDeleteOrganization}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeletingOrg || deleteOrgConfirmText !== "DELETE"}
                >
                  {isDeletingOrg
                    ? (language === "ja" ? "削除中..." : "Deleting...")
                    : (language === "ja" ? "削除" : "Delete")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
