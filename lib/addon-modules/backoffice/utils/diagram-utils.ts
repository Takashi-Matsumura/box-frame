/**
 * draw.io XMLユーティリティ
 * 参照: https://github.com/Takashi-Matsumura/use-drawio-demo
 */

/**
 * XMLをdraw.io形式のmxfileにラップする
 * 既にmxfile形式の場合はそのまま返す
 */
export function wrapWithMxFile(xml: string): string {
  if (!xml || !xml.trim()) {
    return "";
  }

  const trimmedXml = xml.trim();

  // 既にmxfile形式の場合はそのまま返す
  if (trimmedXml.startsWith("<mxfile")) {
    return xml;
  }

  const diagramId = `diagram-${Date.now()}`;

  // mxGraphModel形式の場合は、そのまま内部に含める
  if (trimmedXml.startsWith("<mxGraphModel")) {
    return `<mxfile>
  <diagram id="${diagramId}" name="Page-1">
    ${trimmedXml}
  </diagram>
</mxfile>`;
  }

  // それ以外（mxCellのみの場合など）は、構造を構築する
  const cleanedXml = removeRootCells(xml);

  return `<mxfile>
  <diagram id="${diagramId}" name="Page-1">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${cleanedXml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

/**
 * XMLからルートセル（id="0", id="1"で値を持たないもの）を除外する
 */
function removeRootCells(xml: string): string {
  if (!xml) return xml;

  // 全てのmxCellを抽出
  const cells: string[] = [];
  const regex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const cell = match[0];
    // id="0" のルートセルは除外
    if (cell.match(/id=["']0["']/)) continue;
    // id="1" で値を持たないルートセルは除外（value属性がないか空）
    if (cell.match(/id=["']1["']/) && !cell.match(/value=["'][^"']+["']/))
      continue;
    cells.push(cell);
  }

  // mxCellが抽出できなかった場合は元のXMLをそのまま返す
  if (cells.length === 0 && xml.includes("<mxCell")) {
    return xml;
  }

  return cells.join("\n");
}

/**
 * mxfile形式のXMLから内部のmxCellコンテンツを抽出する
 * APIに送信する際に使用
 */
export function extractMxCellContent(xml: string): string {
  if (!xml) return "";

  // mxfile形式でない場合はそのまま返す
  if (!xml.trim().startsWith("<mxfile")) {
    return xml;
  }

  // <root>...</root>の内容を抽出
  const rootMatch = xml.match(/<root>([\s\S]*)<\/root>/);
  if (!rootMatch) return xml;

  const rootContent = rootMatch[1];

  // 全てのmxCellを抽出（自己終了タグと子要素を持つものの両方に対応）
  const cellMatches: string[] = [];
  const regex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rootContent)) !== null) {
    const cell = match[0];
    // id="0" または id="1"（値なし）のルートセルは除外
    if (cell.match(/id=["']0["']/)) continue;
    if (cell.match(/id=["']1["']/) && !cell.includes("value=")) continue;
    cellMatches.push(cell);
  }

  return cellMatches.join("\n") || xml;
}

/**
 * ユニークなセッションIDを生成する
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * XML文字列のエッジ参照を検証・修正する
 */
export function validateAndFixEdgeReferences(xml: string): string {
  if (!xml) return xml;

  // セルを抽出
  const cells: string[] = [];
  const regex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    cells.push(match[0]);
  }

  if (cells.length === 0) return xml;

  // 有効なIDを収集
  const validIds = extractCellIds(cells);

  // 無効な参照を修正
  const fixedCells = fixInvalidEdgeReferences(cells, validIds);

  return fixedCells.join("\n");
}

/**
 * XMLから全てのセルIDを抽出する
 */
function extractCellIds(cells: string[]): Set<string> {
  const ids = new Set<string>();
  // ルートセルのIDも追加（親参照用）
  ids.add("0");
  ids.add("1");

  for (const cell of cells) {
    const idMatch = cell.match(/id=["']([^"']+)["']/);
    if (idMatch) {
      ids.add(idMatch[1]);
    }
  }
  return ids;
}

/**
 * 無効なエッジ参照（source/target）を削除する
 */
function fixInvalidEdgeReferences(
  cells: string[],
  validIds: Set<string>,
): string[] {
  return cells.map((cell) => {
    // エッジでない場合はそのまま返す
    if (!cell.includes('edge="1"') && !cell.includes("edge='1'")) {
      return cell;
    }

    let fixedCell = cell;

    // source属性をチェック
    const sourceMatch = cell.match(/source=["']([^"']+)["']/);
    if (sourceMatch && !validIds.has(sourceMatch[1])) {
      fixedCell = fixedCell.replace(/\s*source=["'][^"']+["']/, "");
    }

    // target属性をチェック
    const targetMatch = cell.match(/target=["']([^"']+)["']/);
    if (targetMatch && !validIds.has(targetMatch[1])) {
      fixedCell = fixedCell.replace(/\s*target=["'][^"']+["']/, "");
    }

    return fixedCell;
  });
}

/**
 * XML属性値内の特殊文字をエスケープする
 * AIが生成したXMLの問題を修正
 *
 * 修正内容:
 * 1. スマートクォート（カーリークォート）を通常のクォートに変換
 * 2. value属性内の特殊文字をエスケープ
 */
export function sanitizeXmlAttributeValues(xml: string): string {
  if (!xml) return xml;

  let result = xml;

  // 1. スマートクォート（カーリークォート）を通常のクォートに変換
  // AIが "" や '' を生成することがある
  result = result
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // ダブルクォート系
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // シングルクォート系

  // 2. value属性のみを対象にエスケープ（ユーザー向けテキストが含まれる可能性が高い）
  result = result.replace(
    /value="([^"]*)"/g,
    (match, value) => {
      // 既にエスケープされている場合はそのまま返す
      if (value.includes("&amp;") || value.includes("&lt;") || value.includes("&gt;") || value.includes("&apos;") || value.includes("&quot;")) {
        return match;
      }

      // 特殊文字をエスケープ
      const escapedValue = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/'/g, "&apos;");

      return `value="${escapedValue}"`;
    }
  );

  return result;
}

// ============================================
// 2段階生成アプローチ: JSON → draw.io XML 変換
// ============================================

/**
 * 業務フロー図の構造化データ型定義
 */
export interface FlowDiagramData {
  actors: string[];
  steps: FlowStep[];
  connections: FlowConnection[];
}

export interface FlowStep {
  id: string;
  actor: number;  // actorsのインデックス
  label: string;
  type: "start" | "end" | "process" | "decision" | "data" | "database";
}

export interface FlowConnection {
  from: string;
  to: string;
  label?: string;
  type?: "flow" | "data";  // flow=実線, data=点線
}

/**
 * スタイル定義
 */
const STYLES = {
  swimlane: "swimlane;horizontal=1;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;",
  start: "ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;",
  end: "ellipse;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;",
  process: "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
  decision: "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;",
  data: "rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;",
  database: "shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;size=10;",
  flowEdge: "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;endFill=1;",
  dataEdge: "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;endFill=1;dashed=1;dashPattern=3 3;",
};

/**
 * レイアウト定数
 */
const LAYOUT = {
  laneWidth: 180,
  laneHeight: 500,
  laneStartX: 50,
  laneStartY: 50,
  stepWidth: 100,
  stepHeight: 40,
  stepMarginX: 40,
  stepStartY: 50,
  stepGapY: 70,
};

/**
 * XML特殊文字をエスケープ
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 構造化JSONからdraw.io XMLを生成
 */
export function generateFlowDiagramXml(data: FlowDiagramData): string {
  const cells: string[] = [];

  // ルートセル
  cells.push('<mxCell id="0"/>');
  cells.push('<mxCell id="1" parent="0"/>');

  // 各アクターのステップY座標を追跡
  const actorNextY: number[] = data.actors.map(() => LAYOUT.stepStartY);

  // スイムレーン（アクター）を生成
  data.actors.forEach((actor, index) => {
    const laneId = `lane${index}`;
    const x = LAYOUT.laneStartX + index * LAYOUT.laneWidth;
    cells.push(
      `<mxCell id="${laneId}" value="${escapeXml(actor)}" style="${STYLES.swimlane}" vertex="1" parent="1">` +
      `<mxGeometry x="${x}" y="${LAYOUT.laneStartY}" width="${LAYOUT.laneWidth}" height="${LAYOUT.laneHeight}" as="geometry"/>` +
      `</mxCell>`
    );
  });

  // ステップを生成
  data.steps.forEach((step) => {
    const style = STYLES[step.type] || STYLES.process;
    const parentLane = `lane${step.actor}`;
    const y = actorNextY[step.actor];
    actorNextY[step.actor] += LAYOUT.stepGapY;

    cells.push(
      `<mxCell id="${step.id}" value="${escapeXml(step.label)}" style="${style}" vertex="1" parent="${parentLane}">` +
      `<mxGeometry x="${LAYOUT.stepMarginX}" y="${y}" width="${LAYOUT.stepWidth}" height="${LAYOUT.stepHeight}" as="geometry"/>` +
      `</mxCell>`
    );
  });

  // 接続（エッジ）を生成
  data.connections.forEach((conn, index) => {
    const edgeId = `edge${index}`;
    const style = conn.type === "data" ? STYLES.dataEdge : STYLES.flowEdge;
    const value = conn.label ? escapeXml(conn.label) : "";

    cells.push(
      `<mxCell id="${edgeId}" value="${value}" style="${style}" edge="1" parent="1" source="${conn.from}" target="${conn.to}">` +
      `<mxGeometry relative="1" as="geometry"/>` +
      `</mxCell>`
    );
  });

  // mxGraphModelでラップ
  const xml = `<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100">
  <root>
    ${cells.join("\n    ")}
  </root>
</mxGraphModel>`;

  return xml;
}

/**
 * AI出力のJSONをパースしてFlowDiagramDataに変換
 */
export function parseFlowDiagramJson(jsonString: string): FlowDiagramData | null {
  try {
    // JSONブロックを抽出（```json...```形式に対応）
    let jsonStr = jsonString;
    const jsonBlockMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      // { から } までを抽出
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    const data = JSON.parse(jsonStr);

    // バリデーション
    if (!Array.isArray(data.actors) || data.actors.length === 0) {
      console.error("Invalid actors array");
      return null;
    }
    if (!Array.isArray(data.steps)) {
      console.error("Invalid steps array");
      return null;
    }
    if (!Array.isArray(data.connections)) {
      console.error("Invalid connections array");
      return null;
    }

    // 型変換とデフォルト値設定
    const flowData: FlowDiagramData = {
      actors: data.actors.map((a: unknown) => String(a)),
      steps: data.steps.map((s: { id?: string; actor?: number; label?: string; type?: string }, i: number) => ({
        id: s.id || `step${i}`,
        actor: typeof s.actor === "number" ? s.actor : 0,
        label: s.label || `Step ${i + 1}`,
        type: (s.type as FlowStep["type"]) || "process",
      })),
      connections: data.connections.map((c: { from?: string; to?: string; label?: string; type?: string }) => ({
        from: c.from || "",
        to: c.to || "",
        label: c.label,
        type: (c.type as FlowConnection["type"]) || "flow",
      })),
    };

    return flowData;
  } catch (e) {
    console.error("Failed to parse flow diagram JSON:", e);
    return null;
  }
}
