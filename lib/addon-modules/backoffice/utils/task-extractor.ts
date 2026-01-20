/**
 * draw.io XMLから作業（タスク）を抽出するユーティリティ
 */

export interface ExtractedTask {
  cellId: string;
  name: string;
  type: "manual" | "system";
  swimlaneId: string | null;
  actorName: string | null;
  position: { x: number; y: number };
}

export interface ExtractedSwimlane {
  id: string;
  name: string;
}

/**
 * draw.io XMLからタスク（作業）を抽出する
 * - rounded=0 + 四角形 → manual（人手作業）
 * - rounded=1 + 四角形 → system（システム処理）
 * - ellipse, rhombus, swimlane, cylinder は除外
 */
export function extractTasksFromDiagramXml(xml: string): ExtractedTask[] {
  if (!xml) return [];

  const tasks: ExtractedTask[] = [];
  const swimlanes = extractSwimlanesFromDiagramXml(xml);

  // mxCellを抽出（自己終了タグと子要素を持つものの両方に対応）
  const cellRegex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(xml)) !== null) {
    const cell = match[0];

    // ID抽出
    const idMatch = cell.match(/id=["']([^"']+)["']/);
    if (!idMatch) continue;
    const cellId = idMatch[1];

    // ルートセル（0, 1）はスキップ
    if (cellId === "0" || cellId === "1") continue;

    // value（ラベル）抽出
    const valueMatch = cell.match(/value=["']([^"']*)["']/);
    const value = valueMatch ? decodeHtmlEntities(valueMatch[1]) : "";

    // 空のvalueはスキップ
    if (!value.trim()) continue;

    // style属性抽出
    const styleMatch = cell.match(/style=["']([^"']*)["']/);
    const style = styleMatch ? styleMatch[1] : "";

    // 除外パターン：エッジ、楕円（開始/終了）、ひし形（判断）、スイムレーン、シリンダー
    if (isEdge(cell) || isExcludedShape(style)) continue;

    // タスク形状か判定（四角形）
    if (!isTaskShape(style)) continue;

    // タスクタイプ判定
    const taskType = determineTaskType(style);

    // 親（スイムレーン）を取得
    const parentMatch = cell.match(/parent=["']([^"']+)["']/);
    const parentId = parentMatch ? parentMatch[1] : null;
    const swimlaneId =
      parentId && swimlanes.has(parentId) ? parentId : null;
    const actorName = swimlaneId ? swimlanes.get(swimlaneId) || null : null;

    // 位置情報を抽出
    const position = extractPosition(cell);

    tasks.push({
      cellId,
      name: value,
      type: taskType,
      swimlaneId,
      actorName,
      position,
    });
  }

  // 位置でソート（上から下、左から右）
  tasks.sort((a, b) => {
    const yDiff = a.position.y - b.position.y;
    if (Math.abs(yDiff) > 20) return yDiff;
    return a.position.x - b.position.x;
  });

  return tasks;
}

/**
 * draw.io XMLからスイムレーンを抽出する
 */
export function extractSwimlanesFromDiagramXml(
  xml: string
): Map<string, string> {
  const swimlanes = new Map<string, string>();
  if (!xml) return swimlanes;

  const cellRegex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(xml)) !== null) {
    const cell = match[0];

    // style属性を確認
    const styleMatch = cell.match(/style=["']([^"']*)["']/);
    if (!styleMatch) continue;
    const style = styleMatch[1];

    // スイムレーンかどうかチェック
    if (!style.includes("swimlane")) continue;

    // ID取得
    const idMatch = cell.match(/id=["']([^"']+)["']/);
    if (!idMatch) continue;

    // value（ラベル）取得
    const valueMatch = cell.match(/value=["']([^"']*)["']/);
    const value = valueMatch ? decodeHtmlEntities(valueMatch[1]) : "";

    swimlanes.set(idMatch[1], value);
  }

  return swimlanes;
}

/**
 * エッジ（矢印）かどうか判定
 */
function isEdge(cell: string): boolean {
  return cell.includes('edge="1"') || cell.includes("edge='1'");
}

/**
 * 除外すべき形状か判定
 */
function isExcludedShape(style: string): boolean {
  // 楕円（開始/終了ノード）
  if (style.includes("ellipse")) return true;

  // ひし形（判断ノード）
  if (style.includes("rhombus")) return true;

  // スイムレーン
  if (style.includes("swimlane")) return true;

  // シリンダー（データストア）
  if (style.includes("cylinder") || style.includes("shape=cylinder")) return true;

  // ドキュメント形状
  if (style.includes("shape=document")) return true;

  // 台形（手作業/マニュアル操作）- 判断に応じて含めるか除外
  // if (style.includes("shape=trapezoid")) return true;

  return false;
}

/**
 * タスク形状（四角形）か判定
 */
function isTaskShape(style: string): boolean {
  // 空のstyleは通常の四角形
  if (!style) return true;

  // 角丸四角形
  if (style.includes("rounded=")) return true;

  // 通常の四角形（shape指定なし）
  if (
    !style.includes("ellipse") &&
    !style.includes("rhombus") &&
    !style.includes("swimlane") &&
    !style.includes("cylinder") &&
    !style.includes("shape=")
  ) {
    return true;
  }

  // プロセス形状
  if (style.includes("shape=process")) return true;

  // 台形（マニュアル操作）
  if (style.includes("shape=trapezoid")) return true;

  return false;
}

/**
 * タスクタイプを判定
 * - rounded=1（角丸）→ system
 * - rounded=0 または指定なし → manual
 */
function determineTaskType(style: string): "manual" | "system" {
  // 角丸四角形かどうか
  const roundedMatch = style.match(/rounded=(\d)/);
  if (roundedMatch && roundedMatch[1] === "1") {
    return "system";
  }

  // 特定の形状でシステム処理を示すもの
  if (style.includes("shape=process")) {
    return "system";
  }

  // デフォルトは人手作業
  return "manual";
}

/**
 * mxCellからmxGeometryの位置情報を抽出
 */
function extractPosition(cell: string): { x: number; y: number } {
  const geometryMatch = cell.match(
    /<mxGeometry[^>]*x=["']([^"']*)["'][^>]*y=["']([^"']*)["']/
  );

  if (geometryMatch) {
    return {
      x: parseFloat(geometryMatch[1]) || 0,
      y: parseFloat(geometryMatch[2]) || 0,
    };
  }

  // 別のパターン（y, x の順番の場合）
  const geometryMatch2 = cell.match(
    /<mxGeometry[^>]*y=["']([^"']*)["'][^>]*x=["']([^"']*)["']/
  );

  if (geometryMatch2) {
    return {
      x: parseFloat(geometryMatch2[2]) || 0,
      y: parseFloat(geometryMatch2[1]) || 0,
    };
  }

  return { x: 0, y: 0 };
}

/**
 * HTMLエンティティをデコード
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, ""); // HTMLタグを除去
}
