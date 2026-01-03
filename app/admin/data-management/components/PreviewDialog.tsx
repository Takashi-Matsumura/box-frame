"use client";

import { FaUserPlus, FaUserEdit, FaExchangeAlt, FaUserMinus, FaUserSlash, FaExclamationCircle, FaTimes } from "react-icons/fa";
import type { DataManagementTranslation } from "../translations";
import type { PreviewResult } from "@/lib/importers/organization/types";

interface PreviewDialogProps {
  preview: PreviewResult;
  language: "en" | "ja";
  t: DataManagementTranslation;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function PreviewDialog({
  preview,
  language,
  t,
  onClose,
  onConfirm,
  isLoading,
}: PreviewDialogProps) {
  const hasChanges =
    preview.newEmployees.length > 0 ||
    preview.updatedEmployees.length > 0 ||
    preview.transferredEmployees.length > 0 ||
    preview.retiredEmployees.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t.previewTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!hasChanges ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t.noChanges}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard
                  icon={FaUserPlus}
                  label={t.newEmployees}
                  count={preview.newEmployees.length}
                  color="green"
                />
                <SummaryCard
                  icon={FaUserEdit}
                  label={t.updatedEmployees}
                  count={preview.updatedEmployees.length}
                  color="blue"
                />
                <SummaryCard
                  icon={FaExchangeAlt}
                  label={t.transferredEmployees}
                  count={preview.transferredEmployees.length}
                  color="yellow"
                />
                <SummaryCard
                  icon={FaUserMinus}
                  label={t.retiredEmployees}
                  count={preview.retiredEmployees.length}
                  color="red"
                />
                {preview.excludedDuplicates.length > 0 && (
                  <SummaryCard
                    icon={FaUserSlash}
                    label={t.excludedDuplicates}
                    count={preview.excludedDuplicates.length}
                    color="orange"
                  />
                )}
              </div>

              {/* New Employees */}
              {preview.newEmployees.length > 0 && (
                <Section
                  title={t.newEmployees}
                  icon={FaUserPlus}
                  color="green"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">{t.employeeId}</th>
                        <th className="px-3 py-2 text-left">{t.name}</th>
                        <th className="px-3 py-2 text-left">{t.department}</th>
                        <th className="px-3 py-2 text-left">{t.position}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.newEmployees.slice(0, 10).map((emp) => (
                        <tr key={emp.employeeId} className="border-b border-border">
                          <td className="px-3 py-2">{emp.employeeId}</td>
                          <td className="px-3 py-2">{emp.name}</td>
                          <td className="px-3 py-2">{emp.department}</td>
                          <td className="px-3 py-2">{emp.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.newEmployees.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === "ja"
                        ? `他 ${preview.newEmployees.length - 10} 名...`
                        : `...and ${preview.newEmployees.length - 10} more`}
                    </p>
                  )}
                </Section>
              )}

              {/* Updated Employees */}
              {preview.updatedEmployees.length > 0 && (
                <Section
                  title={t.updatedEmployees}
                  icon={FaUserEdit}
                  color="blue"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">{t.employeeId}</th>
                        <th className="px-3 py-2 text-left">{t.name}</th>
                        <th className="px-3 py-2 text-left">{t.details}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.updatedEmployees.slice(0, 10).map((item) => (
                        <tr key={item.employee.employeeId} className="border-b border-border">
                          <td className="px-3 py-2">{item.employee.employeeId}</td>
                          <td className="px-3 py-2">{item.employee.name}</td>
                          <td className="px-3 py-2">
                            {item.changes.map((change) => (
                              <div key={change.fieldName} className="text-xs">
                                <span className="text-muted-foreground">
                                  {change.fieldNameJa}:
                                </span>{" "}
                                <span className="line-through text-red-500">
                                  {change.oldValue || "(なし)"}
                                </span>{" "}
                                →{" "}
                                <span className="text-green-600">
                                  {change.newValue || "(なし)"}
                                </span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.updatedEmployees.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === "ja"
                        ? `他 ${preview.updatedEmployees.length - 10} 名...`
                        : `...and ${preview.updatedEmployees.length - 10} more`}
                    </p>
                  )}
                </Section>
              )}

              {/* Transferred Employees */}
              {preview.transferredEmployees.length > 0 && (
                <Section
                  title={t.transferredEmployees}
                  icon={FaExchangeAlt}
                  color="yellow"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">{t.employeeId}</th>
                        <th className="px-3 py-2 text-left">{t.name}</th>
                        <th className="px-3 py-2 text-left">{t.details}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.transferredEmployees.slice(0, 10).map((item) => (
                        <tr key={item.employee.employeeId} className="border-b border-border">
                          <td className="px-3 py-2">{item.employee.employeeId}</td>
                          <td className="px-3 py-2">{item.employee.name}</td>
                          <td className="px-3 py-2">
                            <span className="line-through text-red-500">
                              {item.oldDepartment}
                            </span>{" "}
                            →{" "}
                            <span className="text-green-600">
                              {item.newDepartment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.transferredEmployees.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === "ja"
                        ? `他 ${preview.transferredEmployees.length - 10} 名...`
                        : `...and ${preview.transferredEmployees.length - 10} more`}
                    </p>
                  )}
                </Section>
              )}

              {/* Retired Employees */}
              {preview.retiredEmployees.length > 0 && (
                <Section
                  title={t.retiredEmployees}
                  icon={FaUserMinus}
                  color="red"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">{t.employeeId}</th>
                        <th className="px-3 py-2 text-left">{t.name}</th>
                        <th className="px-3 py-2 text-left">{t.department}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.retiredEmployees.slice(0, 10).map((emp) => (
                        <tr key={emp.employeeId} className="border-b border-border">
                          <td className="px-3 py-2">{emp.employeeId}</td>
                          <td className="px-3 py-2">{emp.name}</td>
                          <td className="px-3 py-2">{emp.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.retiredEmployees.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === "ja"
                        ? `他 ${preview.retiredEmployees.length - 10} 名...`
                        : `...and ${preview.retiredEmployees.length - 10} more`}
                    </p>
                  )}
                </Section>
              )}

              {/* Excluded Duplicates */}
              {preview.excludedDuplicates.length > 0 && (
                <Section
                  title={t.excludedDuplicates}
                  icon={FaUserSlash}
                  color="orange"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">{t.employeeId}</th>
                        <th className="px-3 py-2 text-left">{t.name}</th>
                        <th className="px-3 py-2 text-left">{t.position}</th>
                        <th className="px-3 py-2 text-left">{t.excludedReason}</th>
                        <th className="px-3 py-2 text-left">{t.keptEmployeeId}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.excludedDuplicates.map((dup) => (
                        <tr key={dup.employeeId} className="border-b border-border">
                          <td className="px-3 py-2 text-muted-foreground line-through">{dup.employeeId}</td>
                          <td className="px-3 py-2">{dup.name}</td>
                          <td className="px-3 py-2">{dup.position}</td>
                          <td className="px-3 py-2 text-orange-600 dark:text-orange-400">{dup.reason}</td>
                          <td className="px-3 py-2 text-green-600 dark:text-green-400">{dup.keptEmployeeId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {/* Errors */}
              {preview.errors.length > 0 && (
                <Section
                  title={t.errors}
                  icon={FaExclamationCircle}
                  color="red"
                >
                  <ul className="space-y-1">
                    {preview.errors.map((err, i) => (
                      <li key={i} className="text-sm text-red-600 dark:text-red-400">
                        {language === "ja" ? `行 ${err.row}: ` : `Row ${err.row}: `}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.cancel}
          </button>
          {hasChanges && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? t.loading : t.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: "green" | "blue" | "yellow" | "red" | "orange";
}) {
  const colorClasses = {
    green: "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300",
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300",
    red: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300",
    orange: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300",
  };

  const iconColors = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.ElementType;
  color: "green" | "blue" | "yellow" | "red" | "orange";
  children: React.ReactNode;
}) {
  const iconColors = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}
