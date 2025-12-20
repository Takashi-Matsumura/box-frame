"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface DeleteOrganizationDataProps {
  language?: string;
  stats: {
    totalEmployees: number;
    departments: number;
    sections: number;
    courses: number;
  };
}

export function DeleteOrganizationData({
  language = "ja",
  stats,
}: DeleteOrganizationDataProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      setError(
        t(
          "Please type DELETE to confirm",
          "確認のため「DELETE」と入力してください",
        ),
      );
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/organization-data", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        // ページをリロードして最新データを表示
        window.location.reload();
      } else {
        setError(result.error || t("Deletion failed", "削除に失敗しました"));
      }
    } catch (_err) {
      setError(t("Network error occurred", "ネットワークエラーが発生しました"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={stats.totalEmployees === 0}
      >
        {t("Delete All Organization Data", "組織データを全て削除")}
      </button>

      {/* 確認モーダル */}
      {isConfirmOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10000]">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
                {t("Delete Organization Data", "組織データの削除")}
              </h3>

              <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  {t(
                    "Warning: This action cannot be undone!",
                    "警告: この操作は元に戻せません！",
                  )}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {t(
                    "The following data will be deleted:",
                    "以下のデータが削除されます：",
                  )}
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                  <li>
                    • {t("Employees", "社員数")}: {stats.totalEmployees}
                    {t(" people", "名")}
                  </li>
                  <li>
                    • {t("Departments", "部門数")}: {stats.departments}
                  </li>
                  <li>
                    • {t("Sections", "部数")}: {stats.sections}
                  </li>
                  <li>
                    • {t("Courses", "課数")}: {stats.courses}
                  </li>
                </ul>
                <p className="text-sm text-red-700 dark:text-red-300 mt-3 font-medium">
                  {t(
                    "Data will be saved as history before deletion.",
                    "削除前にデータは履歴として保存されます。",
                  )}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t(
                    'Type "DELETE" to confirm:',
                    "確認のため「DELETE」と入力してください：",
                  )}
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-background"
                  placeholder="DELETE"
                  disabled={isDeleting}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsConfirmOpen(false);
                    setConfirmText("");
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {t("Cancel", "キャンセル")}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeleting || confirmText !== "DELETE"}
                >
                  {isDeleting
                    ? t("Deleting...", "削除中...")
                    : t("Delete", "削除")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
