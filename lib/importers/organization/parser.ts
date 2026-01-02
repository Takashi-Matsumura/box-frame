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
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr || dateStr.trim() === "") return undefined;

  const cleanedStr = dateStr.replace(/^g+e?\s*/i, "").trim();

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
 * 所属文字列を本部・部・課に分割
 * 例: "PFO本部　データビジネスセンター　ファシリティ管理グループ"
 *   → { department: "PFO本部", section: "データビジネスセンター", course: "ファシリティ管理グループ" }
 */
function parseAffiliation(affiliation: string): {
  department: string;
  section?: string;
  course?: string;
} {
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
    .filter((row) => row.社員番号 && row.氏名 && row.所属)
    .map((row) => {
      // 所属を本部・部・課に分割
      const affiliation = parseAffiliation(row.所属!);

      // 明示的なセクション/コース列があればそちらを優先
      const section = row.セクション?.trim() || affiliation.section;
      const course = row.コース?.trim() || affiliation.course;

      return {
        employeeId: row.社員番号!.trim(),
        name: row.氏名!.trim(),
        nameKana: convertToZenkana(row["氏名(フリガナ)"]?.trim()),
        email: row["社用e-Mail１"]?.trim() || "",
        department: affiliation.department,
        departmentCode: row.所属コード?.trim(),
        section,
        course,
        position: row.役職?.trim() || "一般",
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
