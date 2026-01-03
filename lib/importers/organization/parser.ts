/**
 * 組織データパーサー
 * CSVデータを処理済み社員データに変換
 */

import type { CSVEmployeeRow, ProcessedEmployee } from "./types";

/**
 * Excelシリアル日付を変換
 * Excelの日付は1900年1月1日を1とするシリアル値
 */
function excelSerialToDate(serial: number): Date {
  // Excelのバグ: 1900年はうるう年ではないが、Excelは2/29を存在すると扱う
  // そのため、シリアル値60以降は1日ずれる
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + serial * msPerDay);
}

/**
 * 日付文字列をパース（和暦対応・Excelシリアル対応）
 */
function parseDate(dateStr: string | number | undefined): Date | undefined {
  if (dateStr === undefined || dateStr === null || dateStr === "") return undefined;

  // 数値の場合はExcelシリアル日付として処理
  if (typeof dateStr === "number") {
    // 妥当な範囲（1900年〜2100年）のみ変換
    if (dateStr >= 1 && dateStr <= 73050) {
      return excelSerialToDate(dateStr);
    }
    return undefined;
  }

  // 文字列の場合
  const strValue = String(dateStr).trim();
  if (strValue === "") return undefined;

  const cleanedStr = strValue.replace(/^g+e?\s*/i, "").trim();

  // Excelシリアル日付形式（5桁の数字: 35065 など）
  if (/^\d{5}$/.test(cleanedStr)) {
    const serial = parseInt(cleanedStr, 10);
    // 妥当な範囲（1900年〜2100年）のみ変換
    if (serial >= 1 && serial <= 73050) {
      return excelSerialToDate(serial);
    }
  }

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
  const slashPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const slashMatch = cleanedStr.match(slashPattern);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );
  }

  // その他の形式は無視（不正な日付を防ぐ）
  return undefined;
}

/**
 * 半角カタカナを全角カタカナに変換
 */
function convertToZenkana(str: string | undefined): string | undefined {
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
 * 役員・顧問を示す所属コードのプレフィックス
 * このパターンで始まる所属コードを持つ社員は役員・顧問として扱う
 */
const EXECUTIVE_DEPARTMENT_CODE_PREFIX = "999999";

/**
 * 役員・顧問の本部名
 */
export const EXECUTIVES_DEPARTMENT_NAME = "役員・顧問";

/**
 * 所属コードが役員・顧問を示すコードかどうかを判定
 * 所属コードが「999999」で始まる場合は役員・顧問として扱う
 */
export function isExecutiveDepartmentCode(departmentCode: string | undefined): boolean {
  if (!departmentCode) return false;
  return departmentCode.startsWith(EXECUTIVE_DEPARTMENT_CODE_PREFIX);
}

/**
 * 所属文字列を本部・部・課に分割
 * 例: "PFO本部　データビジネスセンター　ファシリティ管理グループ"
 *   → { department: "PFO本部", section: "データビジネスセンター", course: "ファシリティ管理グループ" }
 */
function parseAffiliation(
  affiliation: string,
  departmentCode?: string
): {
  department: string;
  section?: string;
  course?: string;
} {
  // 所属コードが「999999*」の場合は役員・顧問本部に配置
  if (isExecutiveDepartmentCode(departmentCode)) {
    return {
      department: EXECUTIVES_DEPARTMENT_NAME,
      section: undefined,
      course: undefined,
    };
  }

  // 全角スペースまたは半角スペース（連続含む）で分割
  const parts = affiliation
    .trim()
    .split(/[\s　]+/)
    .filter((p) => p.length > 0);

  return {
    department: parts[0] || affiliation,
    section: parts[1] || undefined,
    course: parts[2] || undefined,
  };
}

/**
 * CSVデータを処理済み社員データに変換
 */
export function processEmployeeData(rows: CSVEmployeeRow[]): ProcessedEmployee[] {
  return rows
    .filter((row) => {
      // 社員番号と氏名は必須
      if (!row.社員番号 || !row.氏名) return false;

      // 役員・顧問（所属コード999999*）の場合は「所属」が空でもOK
      const departmentCode = row.所属コード?.trim() || "";
      if (isExecutiveDepartmentCode(departmentCode)) return true;

      // 一般社員は「所属」が必須
      return !!row.所属;
    })
    .map((row) => {
      const position = row.役職?.trim() || "一般";
      const departmentCode = row.所属コード?.trim();

      // 所属を本部・部・課に分割（所属コードが999999*の場合は役員・顧問本部に配置）
      const affiliation = parseAffiliation(row.所属 || "", departmentCode);

      // 役員・顧問の場合はセクション/コースは設定しない
      const isExec = isExecutiveDepartmentCode(departmentCode);
      const section = isExec
        ? undefined
        : row.セクション?.trim() || affiliation.section;
      const course = isExec
        ? undefined
        : row.コース?.trim() || affiliation.course;

      return {
        employeeId: row.社員番号!.trim(),
        name: row.氏名!.trim(),
        nameKana: convertToZenkana(row["氏名(フリガナ)"]?.trim()),
        email: row["社用e-Mail１"]?.trim() || "",
        department: affiliation.department,
        departmentCode: isExec ? "9999999" : row.所属コード?.trim(), // 役員・顧問は特別なコード
        section,
        course,
        position,
        positionCode: row.役職コード?.trim(),
        phone: row.電話番号?.trim(),
        joinDate: parseDate(row.入社年月日),
        birthDate: parseDate(row.生年月日),
        qualificationGrade: row.資格等級?.trim(),
        qualificationGradeCode: row.資格等級コード?.trim(),
        employmentType: row.雇用区分?.trim(),
        employmentTypeCode: row.雇用区分コード?.trim(),
      };
    });
}

/**
 * 除外された重複社員の情報
 */
export interface ExcludedDuplicate {
  employee: ProcessedEmployee;
  reason: string;
  keptEmployeeId: string;
}

/**
 * 重複除去を含む処理結果
 */
export interface ProcessedDataWithDuplicates {
  employees: ProcessedEmployee[];
  excludedDuplicates: ExcludedDuplicate[];
}

/**
 * CSVデータを処理し、役員・顧問の重複を除去
 * 同一氏名の役員・顧問がいる場合、社員番号が若いものを残す
 */
export function processEmployeeDataWithDeduplication(
  rows: CSVEmployeeRow[]
): ProcessedDataWithDuplicates {
  const processed = processEmployeeData(rows);
  const excludedDuplicates: ExcludedDuplicate[] = [];

  // 役員・顧問とそれ以外を分離
  const executives = processed.filter(
    (e) => e.department === EXECUTIVES_DEPARTMENT_NAME
  );
  const nonExecutives = processed.filter(
    (e) => e.department !== EXECUTIVES_DEPARTMENT_NAME
  );

  // 役員・顧問の重複を検出（氏名でグループ化）
  const executivesByName = new Map<string, ProcessedEmployee[]>();
  for (const exec of executives) {
    // 氏名からスペースを除去して比較（「天久 進」と「天久進」を同一視）
    const normalizedName = exec.name.replace(/\s+/g, "");
    const existing = executivesByName.get(normalizedName) || [];
    existing.push(exec);
    executivesByName.set(normalizedName, existing);
  }

  // 重複がある場合、社員番号が最も若いものを残す
  const deduplicatedExecutives: ProcessedEmployee[] = [];
  for (const [, execs] of executivesByName) {
    if (execs.length === 1) {
      deduplicatedExecutives.push(execs[0]);
    } else {
      // 社員番号でソート（文字列比較）
      execs.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
      const kept = execs[0];
      deduplicatedExecutives.push(kept);

      // 除外された社員を記録
      for (let i = 1; i < execs.length; i++) {
        excludedDuplicates.push({
          employee: execs[i],
          reason: "役員・顧問の重複（同一氏名）",
          keptEmployeeId: kept.employeeId,
        });
      }
    }
  }

  return {
    employees: [...deduplicatedExecutives, ...nonExecutives],
    excludedDuplicates,
  };
}
