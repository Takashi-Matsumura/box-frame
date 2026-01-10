"use client";

import { useCallback, useState } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileExcel,
  FaTimes,
  FaUpload,
} from "react-icons/fa";
import ExcelJS from "exceljs";
import type {
  CSVEmployeeRow,
  PreviewResult,
} from "@/lib/importers/organization/types";
import type { DataManagementTranslation } from "../translations";
import { PreviewDialog } from "./PreviewDialog";

interface ImportTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

interface ParsedFile {
  file: File;
  data: CSVEmployeeRow[];
}

export function ImportTab({ organizationId, language, t }: ImportTabProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [markMissingAsRetired, setMarkMissingAsRetired] = useState(false);

  const parseFile = async (file: File): Promise<CSVEmployeeRow[]> => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      return parseCSV(text);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      return await parseXLSX(buffer);
    } else {
      throw new Error(`Unsupported file format: ${file.name}`);
    }
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);
      setSuccess(null);
      setPreview(null);

      const newParsedFiles: ParsedFile[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        try {
          const data = await parseFile(file);
          newParsedFiles.push({ file, data });
        } catch (err) {
          errors.push(
            err instanceof Error ? err.message : `Failed to parse ${file.name}`,
          );
        }
      }

      setParsedFiles((prev) => [...prev, ...newParsedFiles]);

      if (errors.length > 0) {
        setError(errors.join(", "));
      }
    },
    [],
  );

  const parseCSV = (csvText: string): CSVEmployeeRow[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length <= 1) {
      throw new Error("CSV file is empty or contains only headers");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: CSVEmployeeRow = {};
      headers.forEach((header, i) => {
        (row as Record<string, string>)[header] = values[i] || "";
      });
      return row;
    });
  };

  const parseXLSX = async (buffer: ArrayBuffer): Promise<CSVEmployeeRow[]> => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("XLSX file has no sheets");
    }

    const data: CSVEmployeeRow[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => {
          headers.push(String(cell.value ?? ""));
        });
      } else {
        const rowData: Record<string, string> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = String(cell.value ?? "");
          }
        });
        if (Object.values(rowData).some((v) => v !== "")) {
          data.push(rowData as CSVEmployeeRow);
        }
      }
    });

    return data;
  };

  // 全ファイルからのデータを結合
  const getAllParsedData = useCallback((): CSVEmployeeRow[] => {
    return parsedFiles.flatMap((pf) => pf.data);
  }, [parsedFiles]);

  // ファイルを削除
  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreview(null);
  }, []);

  // 全ファイルをクリア
  const clearAllFiles = useCallback(() => {
    setParsedFiles([]);
    setPreview(null);
    setError(null);
    setSuccess(null);
  }, []);

  const handlePreview = async () => {
    const allData = getAllParsedData();
    if (!allData.length) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/organization/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: allData,
          organizationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const result = await response.json();
      setPreview(result.preview);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const allData = getAllParsedData();
    if (!allData.length) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/organization/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: allData,
          organizationId,
          options: {
            markMissingAsRetired,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }

      const result = await response.json();
      setSuccess(
        `${t.importSuccess}: ${result.statistics.created} ${language === "ja" ? "名追加" : "added"}, ${result.statistics.updated} ${language === "ja" ? "名更新" : "updated"}, ${result.statistics.transferred} ${language === "ja" ? "名異動" : "transferred"}`,
      );
      setShowPreview(false);
      setParsedFiles([]);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        const dataTransfer = new DataTransfer();
        for (const file of Array.from(droppedFiles)) {
          dataTransfer.items.add(file);
        }
        input.files = dataTransfer.files;
        handleFileChange({
          target: input,
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [handleFileChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FaUpload className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.importTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{t.importDescription}</p>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <FaFileExcel className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-foreground font-medium mb-2">{t.dropFileHere}</p>
        <p className="text-sm text-muted-foreground">{t.supportedFormats}</p>
        <p className="text-sm text-muted-foreground">{t.maxFileSize}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {language === "ja"
            ? "※複数ファイルをドロップできます"
            : "※You can drop multiple files"}
        </p>
      </div>

      {/* File List */}
      {parsedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {language === "ja"
                ? `${parsedFiles.length}件のファイル（合計${getAllParsedData().length}レコード）`
                : `${parsedFiles.length} files (${getAllParsedData().length} records total)`}
            </p>
            <button
              type="button"
              onClick={clearAllFiles}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {language === "ja" ? "すべてクリア" : "Clear All"}
            </button>
          </div>
          {parsedFiles.map((pf, index) => (
            <div
              key={`${pf.file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {pf.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "ja"
                      ? `${pf.data.length}件のレコード`
                      : `${pf.data.length} records`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {parsedFiles.length > 0 && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={markMissingAsRetired}
              onChange={(e) => setMarkMissingAsRetired(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t.markMissingAsRetired}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.markMissingAsRetiredDesc}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <FaExclamationTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <FaCheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Action Buttons */}
      {parsedFiles.length > 0 && (
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t.loading : t.preview}
          </button>
        </div>
      )}

      {/* Preview Dialog */}
      {showPreview && preview && (
        <PreviewDialog
          preview={preview}
          language={language}
          t={t}
          onClose={() => setShowPreview(false)}
          onConfirm={handleImport}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
