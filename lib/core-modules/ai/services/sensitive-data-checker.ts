/**
 * 機密情報・個人情報チェッカー（クライアントサイド）
 *
 * 正規表現パターンマッチでPII（個人識別情報）を検出する。
 * サーバー依存なし。Stage 1（即時チェック）として使用。
 */

export interface SensitiveDataMatch {
  category: string;
  matches: string[];
}

export interface SensitiveDataResult {
  detected: boolean;
  items: SensitiveDataMatch[];
  totalCount: number;
}

export interface LlmCheckItem {
  category: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface LlmCheckResult {
  detected: boolean;
  items: LlmCheckItem[];
}

/**
 * マッチした文字列をマスクする
 * 先頭と末尾の一部だけ見せて中間をマスク
 */
function maskMatch(str: string): string {
  if (str.length <= 4) return "***";
  if (str.length <= 8) return str.slice(0, 2) + "***" + str.slice(-1);
  return str.slice(0, 3) + "***" + str.slice(-2);
}

/**
 * Luhnアルゴリズムでクレジットカード番号を検証
 */
function isValidLuhn(digits: string): boolean {
  const nums = digits.replace(/\D/g, "");
  if (nums.length < 13 || nums.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = parseInt(nums[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

interface PatternDef {
  category: string;
  patterns: RegExp[];
  validate?: (match: string) => boolean;
}

const PATTERNS: PatternDef[] = [
  {
    category: "email",
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g],
  },
  {
    category: "phone",
    patterns: [
      // 携帯電話: 090-1234-5678, 09012345678, 090 1234 5678
      /(?<!\d)0[789]0[- ]?\d{4}[- ]?\d{4}(?!\d)/g,
      // 固定電話: 03-1234-5678, 0312345678
      /(?<!\d)0\d{1,4}[- ]?\d{1,4}[- ]?\d{4}(?!\d)/g,
      // 国際形式: +81-90-1234-5678
      /\+81[- ]?\d{1,4}[- ]?\d{1,4}[- ]?\d{4}/g,
    ],
  },
  {
    category: "address",
    patterns: [
      // 都道府県+市区町村+番地
      /(?:北海道|(?:東京|京都|大阪)(?:都|府)|.{2,3}県).{1,6}(?:市|区|町|村|郡).{0,20}(?:\d{1,5}[--]\d{1,5}(?:[--]\d{1,5})?)/g,
      // 〒 郵便番号
      /〒?\s?\d{3}[- ]\d{4}/g,
    ],
  },
  {
    category: "myNumber",
    patterns: [
      // マイナンバー: 12桁の数字（スペース区切りも対応）
      /(?<!\d)\d{4}[\s ]?\d{4}[\s ]?\d{4}(?!\d)/g,
    ],
    validate: (match: string) => {
      const digits = match.replace(/\s/g, "");
      // 12桁ちょうどでなければスキップ
      if (digits.length !== 12) return false;
      // 全て同じ数字の場合はスキップ（誤検出防止）
      if (/^(\d)\1{11}$/.test(digits)) return false;
      return true;
    },
  },
  {
    category: "bankAccount",
    patterns: [
      // 普通/当座 + 口座番号
      /(?:普通|当座|定期)[預貯]?金?\s*(?:口座)?\s*[：:]?\s*\d{6,8}/g,
      // 口座番号パターン
      /口座\s*(?:番号)?\s*[：:]?\s*\d{6,8}/g,
    ],
  },
  {
    category: "creditCard",
    patterns: [
      // 16桁数字（ハイフンやスペース区切り）
      /(?<!\d)\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}(?!\d)/g,
    ],
    validate: (match: string) => isValidLuhn(match),
  },
  {
    category: "personalFinance",
    patterns: [
      // 人名 + 金融キーワードの近接（日本語名パターン）
      /(?:[一-龥]{1,4}(?:さん|氏|様)?の?(?:年収|月収|給与|給料|報酬|賞与|ボーナス|所得|収入)(?:は|が|：|:)?\s*\d+\s*(?:万|千|百)?(?:円|ドル|＄|\$)?)/g,
      /(?:(?:年収|月収|給与|給料|報酬|所得|収入)(?:は|が|：|:)?\s*\d+\s*(?:万|千|百)?(?:円|ドル|＄|\$)?\s*(?:の|である)?[一-龥]{1,4}(?:さん|氏|様)?)/g,
    ],
  },
  {
    category: "financialData",
    patterns: [
      // 売上・利益・予算等 + 金額
      /(?:売上|売上高|revenue|利益|利益率|profit|営業利益|経常利益|純利益|粗利|原価|予算|budget|コスト|cost)(?:高|額|率)?(?:は|が|：|:|of|was|is)?\s*[\d,，.]+\s*(?:万|億|千万|百万|兆)?(?:円|ドル|＄|\$|%|％|USD|JPY)/gi,
      // 金額 + 財務キーワード
      /[\d,，.]+\s*(?:万|億|千万|百万|兆)?(?:円|ドル|＄|\$)\s*(?:の|の売上|の利益|の予算|の損失|の赤字|の黒字)/g,
      // パーセンテージ + 財務キーワード
      /(?:利益率|profit margin|営業利益率|粗利率|原価率|成長率|growth rate)(?:は|が|：|:|of|was|is)?\s*[\d.]+\s*(?:%|％|percent)/gi,
    ],
  },
  {
    category: "compensation",
    patterns: [
      // 手当・給与・報酬テーブル（金額付き）
      /(?:手当|基本給|月[額給]|日[額給]|時給|賃金|俸給|役職手当|職務手当|資格手当|住宅手当|通勤手当|家族手当|残業手当|深夜手当|休日手当)(?:月額|年額|日額)?\s*[：:]?\s*[\d,，]+\s*円/g,
      // 職級・等級 + 金額パターン
      /(?:[\w一-龥]+(?:級|等級|号(?:俸|給)|ランク|グレード))\s*[\d,，]+\s*円/g,
    ],
  },
];

/**
 * テキスト内の機密情報・個人情報をチェック
 */
export function checkSensitiveData(text: string): SensitiveDataResult {
  const items: SensitiveDataMatch[] = [];
  let totalCount = 0;

  for (const patternDef of PATTERNS) {
    const matchesSet = new Set<string>();

    for (const regex of patternDef.patterns) {
      // Reset lastIndex for global regex
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        // バリデーションがある場合はチェック
        if (patternDef.validate && !patternDef.validate(value)) {
          continue;
        }
        matchesSet.add(value);
      }
    }

    if (matchesSet.size > 0) {
      const maskedMatches = Array.from(matchesSet).map(maskMatch);
      items.push({
        category: patternDef.category,
        matches: maskedMatches,
      });
      totalCount += matchesSet.size;
    }
  }

  return {
    detected: totalCount > 0,
    items,
    totalCount,
  };
}
