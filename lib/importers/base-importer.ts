/**
 * ベースインポーター - フレーム機能
 * 汎用的なファイルインポート機能を提供
 */

import * as XLSX from "xlsx";

/**
 * インポーター設定
 */
export interface ImporterConfig {
  fileTypes: string[];
  maxFileSize: number;
  requiredColumns?: string[];
}

/**
 * インポート結果
 */
export interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  statistics?: {
    totalRecords: number;
    created: number;
    updated?: number;
    transferred?: number;
    promoted?: number;
    retired?: number;
    skipped?: number;
    errors?: number;
  };
}

/**
 * ベースインポータークラス
 * 各モジュール固有のインポーターはこのクラスを継承して実装する
 */
export abstract class BaseImporter<TRow = any, TProcessed = any> {
  constructor(protected config: ImporterConfig) {}

  /**
   * ファイルを読み込んでパース
   */
  async parseFile(file: File): Promise<TRow[]> {
    if (file.size > this.config.maxFileSize) {
      throw new Error(
        `ファイルサイズが大きすぎます（最大: ${this.config.maxFileSize / 1024 / 1024}MB）`
      );
    }

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      return this.parseCSV(text);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      return this.parseXLSX(buffer);
    }

    throw new Error(
      `サポートされていないファイル形式です（対応形式: ${this.config.fileTypes.join(", ")}）`
    );
  }

  /**
   * CSVテキストをパース
   */
  protected parseCSV(csvText: string): TRow[] {
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length <= 1) {
      throw new Error("CSVファイルが空またはヘッダーのみです");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    if (this.config.requiredColumns) {
      const missingColumns = this.config.requiredColumns.filter(
        (col) => !headers.includes(col)
      );
      if (missingColumns.length > 0) {
        throw new Error(
          `必須カラムが見つかりません: ${missingColumns.join(", ")}`
        );
      }
    }

    const data: TRow[] = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: any = {};

      headers.forEach((header, i) => {
        row[header] = values[i] || "";
      });

      return row;
    });

    return data;
  }

  /**
   * XLSXファイル（ArrayBuffer）をパース
   */
  protected parseXLSX(buffer: ArrayBuffer): TRow[] {
    try {
      const workbook = XLSX.read(buffer, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("XLSXファイルにシートが見つかりません");
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (jsonData.length === 0) {
        throw new Error("XLSXファイルにデータが見つかりません");
      }

      if (this.config.requiredColumns && jsonData.length > 0) {
        const headers = Object.keys(jsonData[0] as object);
        const missingColumns = this.config.requiredColumns.filter(
          (col) => !headers.includes(col)
        );
        if (missingColumns.length > 0) {
          throw new Error(
            `必須カラムが見つかりません: ${missingColumns.join(", ")}`
          );
        }
      }

      return jsonData as TRow[];
    } catch (error) {
      console.error("XLSX parse error:", error);
      throw new Error(
        `XLSXファイルの解析に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * 日付文字列をパース（和暦対応）
   */
  protected parseDate(dateStr: string): Date | undefined {
    if (!dateStr || dateStr.trim() === "") return undefined;

    const cleanedStr = dateStr.replace(/^g+e?\s*/i, "").trim();

    // 和暦パターン: R5.4.1, H30.10.5, S63.12.31
    const warekiPattern = /^([RHS])(\d+)\.(\d+)\.(\d+)$/;
    const match = cleanedStr.match(warekiPattern);

    if (match) {
      const [, era, year, month, day] = match;
      let fullYear: number;

      switch (era) {
        case "R":
          fullYear = parseInt(year, 10) + 2018;
          break;
        case "H":
          fullYear = parseInt(year, 10) + 1988;
          break;
        case "S":
          fullYear = parseInt(year, 10) + 1925;
          break;
        default:
          return undefined;
      }

      return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
    }

    // 日本語形式: 1997年4月1日
    const japanesePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
    const japaneseMatch = cleanedStr.match(japanesePattern);
    if (japaneseMatch) {
      const [, year, month, day] = japaneseMatch;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10)
      );
    }

    // 西暦パターン: 2023/4/1, 2023-04-01
    const date = new Date(cleanedStr);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * 半角カタカナを全角カタカナに変換
   */
  protected convertToZenkana(str: string): string {
    if (!str) return str;

    const kanaMap: Record<string, string> = {
      ｶﾞ: "ガ",
      ｷﾞ: "ギ",
      ｸﾞ: "グ",
      ｹﾞ: "ゲ",
      ｺﾞ: "ゴ",
      ｻﾞ: "ザ",
      ｼﾞ: "ジ",
      ｽﾞ: "ズ",
      ｾﾞ: "ゼ",
      ｿﾞ: "ゾ",
      ﾀﾞ: "ダ",
      ﾁﾞ: "ヂ",
      ﾂﾞ: "ヅ",
      ﾃﾞ: "デ",
      ﾄﾞ: "ド",
      ﾊﾞ: "バ",
      ﾋﾞ: "ビ",
      ﾌﾞ: "ブ",
      ﾍﾞ: "ベ",
      ﾎﾞ: "ボ",
      ﾊﾟ: "パ",
      ﾋﾟ: "ピ",
      ﾌﾟ: "プ",
      ﾍﾟ: "ペ",
      ﾎﾟ: "ポ",
      ｳﾞ: "ヴ",
      ﾜﾞ: "ヷ",
      ｦﾞ: "ヺ",
      ｱ: "ア",
      ｲ: "イ",
      ｳ: "ウ",
      ｴ: "エ",
      ｵ: "オ",
      ｶ: "カ",
      ｷ: "キ",
      ｸ: "ク",
      ｹ: "ケ",
      ｺ: "コ",
      ｻ: "サ",
      ｼ: "シ",
      ｽ: "ス",
      ｾ: "セ",
      ｿ: "ソ",
      ﾀ: "タ",
      ﾁ: "チ",
      ﾂ: "ツ",
      ﾃ: "テ",
      ﾄ: "ト",
      ﾅ: "ナ",
      ﾆ: "ニ",
      ﾇ: "ヌ",
      ﾈ: "ネ",
      ﾉ: "ノ",
      ﾊ: "ハ",
      ﾋ: "ヒ",
      ﾌ: "フ",
      ﾍ: "ヘ",
      ﾎ: "ホ",
      ﾏ: "マ",
      ﾐ: "ミ",
      ﾑ: "ム",
      ﾒ: "メ",
      ﾓ: "モ",
      ﾔ: "ヤ",
      ﾕ: "ユ",
      ﾖ: "ヨ",
      ﾗ: "ラ",
      ﾘ: "リ",
      ﾙ: "ル",
      ﾚ: "レ",
      ﾛ: "ロ",
      ﾜ: "ワ",
      ｦ: "ヲ",
      ﾝ: "ン",
      ｧ: "ァ",
      ｨ: "ィ",
      ｩ: "ゥ",
      ｪ: "ェ",
      ｫ: "ォ",
      ｯ: "ッ",
      ｬ: "ャ",
      ｭ: "ュ",
      ｮ: "ョ",
      ｰ: "ー",
      "｡": "。",
      "､": "、",
      "･": "・",
      "｢": "「",
      "｣": "」",
    };

    let result = str;

    // 濁点・半濁点付きの文字を優先的に変換（2文字パターン）
    Object.keys(kanaMap).forEach((key) => {
      if (key.length === 2) {
        result = result.replace(new RegExp(key, "g"), kanaMap[key]);
      }
    });

    // 単体の文字を変換（1文字パターン）
    Object.keys(kanaMap).forEach((key) => {
      if (key.length === 1) {
        result = result.replace(new RegExp(key, "g"), kanaMap[key]);
      }
    });

    return result;
  }

  /**
   * データを処理（各モジュールで実装）
   */
  abstract processData(rows: TRow[]): TProcessed[];

  /**
   * データベースにインポート（各モジュールで実装）
   */
  abstract importToDatabase(data: TProcessed[]): Promise<ImportResult>;
}
