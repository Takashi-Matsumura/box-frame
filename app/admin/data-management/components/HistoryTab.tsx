"use client";

import type { ChangeType } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { FaFilter, FaHistory } from "react-icons/fa";
import type { DataManagementTranslation } from "../translations";

interface ChangeLog {
  id: string;
  entityType: string;
  entityId: string;
  changeType: ChangeType;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changeDescription: string | null;
  batchId: string | null;
  changedBy: string;
  changedAt: string;
}

interface HistoryTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

const changeTypeColors: Record<ChangeType, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  TRANSFER: "bg-yellow-100 text-yellow-700",
  PROMOTION: "bg-purple-100 text-purple-700",
  RETIREMENT: "bg-gray-100 text-gray-700",
  REJOINING: "bg-teal-100 text-teal-700",
  IMPORT: "bg-indigo-100 text-indigo-700",
  BULK_UPDATE: "bg-orange-100 text-orange-700",
  EXPORT: "bg-cyan-100 text-cyan-700",
};

export function HistoryTab({ organizationId, language, t }: HistoryTabProps) {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "100",
      });

      if (changeTypeFilter) {
        params.set("changeType", changeTypeFilter);
      }

      if (entityTypeFilter) {
        params.set("entityType", entityTypeFilter);
      }

      const response = await fetch(`/api/admin/organization/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [changeTypeFilter, entityTypeFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getChangeTypeLabel = (type: ChangeType): string => {
    const labels: Record<ChangeType, { en: string; ja: string }> = {
      CREATE: { en: "Create", ja: "新規作成" },
      UPDATE: { en: "Update", ja: "更新" },
      DELETE: { en: "Delete", ja: "削除" },
      TRANSFER: { en: "Transfer", ja: "異動" },
      PROMOTION: { en: "Promotion", ja: "昇進" },
      RETIREMENT: { en: "Retirement", ja: "退職" },
      REJOINING: { en: "Rejoining", ja: "復職" },
      IMPORT: { en: "Import", ja: "インポート" },
      BULK_UPDATE: { en: "Bulk Update", ja: "一括更新" },
      EXPORT: { en: "Export", ja: "エクスポート" },
    };
    return labels[type]?.[language] || type;
  };

  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, { en: string; ja: string }> = {
      Employee: { en: "Employee", ja: "社員" },
      Department: { en: "Department", ja: "本部" },
      Section: { en: "Section", ja: "部" },
      Course: { en: "Course", ja: "課" },
      Organization: { en: "Organization", ja: "組織" },
    };
    return labels[type]?.[language] || type;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return language === "ja"
      ? date.toLocaleString("ja-JP")
      : date.toLocaleString("en-US");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FaHistory className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-foreground">
          {t.historyTitle}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FaFilter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t.filter}:</span>
        </div>

        <select
          value={changeTypeFilter}
          onChange={(e) => setChangeTypeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            {t.changeType}: {t.all}
          </option>
          <option value="CREATE">{getChangeTypeLabel("CREATE")}</option>
          <option value="UPDATE">{getChangeTypeLabel("UPDATE")}</option>
          <option value="DELETE">{getChangeTypeLabel("DELETE")}</option>
          <option value="TRANSFER">{getChangeTypeLabel("TRANSFER")}</option>
          <option value="PROMOTION">{getChangeTypeLabel("PROMOTION")}</option>
          <option value="RETIREMENT">{getChangeTypeLabel("RETIREMENT")}</option>
          <option value="IMPORT">{getChangeTypeLabel("IMPORT")}</option>
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">エンティティ: {t.all}</option>
          <option value="Employee">{getEntityTypeLabel("Employee")}</option>
          <option value="Department">{getEntityTypeLabel("Department")}</option>
          <option value="Section">{getEntityTypeLabel("Section")}</option>
          <option value="Course">{getEntityTypeLabel("Course")}</option>
          <option value="Organization">
            {getEntityTypeLabel("Organization")}
          </option>
        </select>
      </div>

      {/* History Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t.loading}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FaHistory className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noHistory}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  {t.changedAt}
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  {t.changeType}
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  {language === "ja" ? "エンティティ" : "Entity"}
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  {t.details}
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  {t.changedBy}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {formatDate(log.changedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${changeTypeColors[log.changeType]}`}
                    >
                      {getChangeTypeLabel(log.changeType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <div>
                      <p className="font-medium">
                        {getEntityTypeLabel(log.entityType)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {log.entityId}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {log.changeDescription ? (
                      <p className="max-w-[300px] truncate">
                        {log.changeDescription}
                      </p>
                    ) : log.fieldName ? (
                      <div className="text-xs">
                        <span className="text-muted-foreground">
                          {log.fieldName}:{" "}
                        </span>
                        <span className="line-through text-red-500">
                          {log.oldValue || "(なし)"}
                        </span>{" "}
                        →{" "}
                        <span className="text-green-600">
                          {log.newValue || "(なし)"}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <span className="text-xs truncate max-w-[100px] block">
                      {log.changedBy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
