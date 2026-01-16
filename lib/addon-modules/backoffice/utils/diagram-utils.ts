/**
 * draw.io XMLユーティリティ
 * 参照: https://github.com/Takashi-Matsumura/use-drawio-demo
 */

/**
 * XMLをdraw.io形式のmxfileにラップする
 * 既にmxfile形式の場合はそのまま返す
 */
export function wrapWithMxFile(xml: string): string {
  // 既にmxfile形式の場合はそのまま返す
  if (xml.trim().startsWith("<mxfile")) {
    return xml;
  }

  // APIから返されるXMLに含まれるルートセル（id="0", id="1"）を除外
  // これにより重複IDを防ぐ
  const cleanedXml = removeRootCells(xml);

  const diagramId = `diagram-${Date.now()}`;

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
