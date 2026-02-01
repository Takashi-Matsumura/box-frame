"use client";

import { Loader2, Save, Send, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Excalidraw imports are dynamic since they don't support SSR
let Excalidraw: typeof import("@excalidraw/excalidraw").Excalidraw;
let convertToExcalidrawElements: typeof import("@excalidraw/excalidraw").convertToExcalidrawElements;
let restoreElements: typeof import("@excalidraw/excalidraw").restoreElements;

type ExcalidrawImperativeAPI =
  import("@excalidraw/excalidraw/types").ExcalidrawImperativeAPI;

interface ExcalidrawFlowEditorProps {
  language: "en" | "ja";
  flowSection: string;
  stakeholderSection: string;
  initialData: unknown[] | null;
  configOverride?: Record<string, unknown>;
  onSave: (elements: unknown[]) => Promise<void>;
  translations: {
    generateFlowDiagram: string;
    generatingFlowDiagram: string;
    saveFlowDiagram: string;
    savingFlowDiagram: string;
    clearCanvas: string;
    clearCanvasConfirm: string;
    flowDiagramChat: string;
  };
}

const EXCALIDRAW_SYSTEM_PROMPT = `You are a business flow diagram generator. You create **swim lane diagrams** as Excalidraw element skeletons in JSON.

## Output Format
Return a JSON object:
{
  "action": "add" | "replace" | "modify",
  "elements": [ ...ExcalidrawElementSkeleton objects... ]
}

### Action Types
- "replace": Clear canvas and draw from scratch (default for new diagrams).
- "add": Add new elements to the existing canvas.
- "modify": Update elements by matching IDs, and add any new elements.

## Swim Lane Diagram Structure

A swim lane diagram has:
1. **Lane backgrounds** — tall, narrow rectangles arranged left-to-right, one per stakeholder/role. Each lane has a distinct background color.
2. **Lane headers** — text labels at the top of each lane showing the stakeholder name.
3. **Task boxes** — smaller rectangles placed INSIDE the lane of the responsible stakeholder.
4. **Decision diamonds** — placed inside lanes for branch points.
5. **Flow arrows** — connecting task boxes to show the sequence of work.

## Layout Rules

### Lanes
- Each lane is a tall rectangle: width=220, height depends on task count (minimum 600).
- Lanes are placed side-by-side horizontally with NO gap (x increments by 220).
- Lane backgrounds use light, distinct colors with LOW opacity feel:
  "#a5d8ff" (blue), "#b2f2bb" (green), "#ffd8a8" (orange), "#fcc2d7" (pink), "#d0bfff" (purple), "#fff3bf" (yellow)
- Lane strokeColor: "#868e96" (gray)
- Lane IDs: "lane_0", "lane_1", etc.

### Lane Headers
- Text element at the top center of each lane (y = lane.y + 15, x = lane.x + lane.width/2 - estimated offset).
- fontSize: 18, bold style implied by being a header.
- ID: "header_0", "header_1", etc.

### Task Boxes
- Rectangle: width=180, height=50
- Centered horizontally within the lane: x = lane.x + 20
- Spaced vertically: first task at y=laneTop+60, subsequent tasks spaced 100px apart.
- backgroundColor: "#ffffff" (white), strokeColor: "#1e1e1e"
- label: { "text": "task description" } — keep text concise (max ~20 chars)
- IDs: "task_1", "task_2", etc.

### Decision Diamonds
- Diamond: width=140, height=90
- Centered within the lane like task boxes.
- backgroundColor: "#fff3bf" (yellow), strokeColor: "#1e1e1e"
- label: { "text": "condition?" }

### Flow Arrows
- Connect tasks in sequence using start/end references.
- For tasks in the SAME lane: simple vertical arrow (width=0, height=positive).
- For tasks in DIFFERENT lanes: diagonal arrow crossing lanes (width=horizontal distance, height=vertical distance).
- Arrow labels are optional — use them for decision branches ("Yes"/"No") or handoff descriptions.

## Element Types

### Rectangle
{ "type": "rectangle", "id": string, "x": number, "y": number, "width": number, "height": number, "backgroundColor": string, "strokeColor": string, "label": { "text": string } }

### Diamond
{ "type": "diamond", "id": string, "x": number, "y": number, "width": number, "height": number, "backgroundColor": string, "strokeColor": string, "label": { "text": string } }

### Text
{ "type": "text", "id": string, "x": number, "y": number, "text": string, "fontSize": number }

### Arrow
{ "type": "arrow", "x": number, "y": number, "width": number, "height": number, "label": { "text": string }, "start": { "type": "rectangle"|"diamond", "id": string }, "end": { "type": "rectangle"|"diamond", "id": string } }

## Example: 3-Lane Swim Lane Diagram

{
  "action": "replace",
  "elements": [
    { "type": "rectangle", "id": "lane_0", "x": 0, "y": 0, "width": 220, "height": 600, "backgroundColor": "#a5d8ff", "strokeColor": "#868e96" },
    { "type": "rectangle", "id": "lane_1", "x": 220, "y": 0, "width": 220, "height": 600, "backgroundColor": "#b2f2bb", "strokeColor": "#868e96" },
    { "type": "rectangle", "id": "lane_2", "x": 440, "y": 0, "width": 220, "height": 600, "backgroundColor": "#ffd8a8", "strokeColor": "#868e96" },
    { "type": "text", "id": "header_0", "x": 50, "y": 15, "text": "申請者", "fontSize": 18 },
    { "type": "text", "id": "header_1", "x": 270, "y": 15, "text": "承認者", "fontSize": 18 },
    { "type": "text", "id": "header_2", "x": 490, "y": 15, "text": "経理部", "fontSize": 18 },
    { "type": "rectangle", "id": "task_1", "x": 20, "y": 60, "width": 180, "height": 50, "backgroundColor": "#ffffff", "strokeColor": "#1e1e1e", "label": { "text": "申請書作成" } },
    { "type": "rectangle", "id": "task_2", "x": 240, "y": 160, "width": 180, "height": 50, "backgroundColor": "#ffffff", "strokeColor": "#1e1e1e", "label": { "text": "内容確認" } },
    { "type": "diamond", "id": "task_3", "x": 260, "y": 260, "width": 140, "height": 90, "backgroundColor": "#fff3bf", "strokeColor": "#1e1e1e", "label": { "text": "承認?" } },
    { "type": "rectangle", "id": "task_4", "x": 460, "y": 400, "width": 180, "height": 50, "backgroundColor": "#ffffff", "strokeColor": "#1e1e1e", "label": { "text": "処理実行" } },
    { "type": "rectangle", "id": "task_5", "x": 20, "y": 300, "width": 180, "height": 50, "backgroundColor": "#ffffff", "strokeColor": "#1e1e1e", "label": { "text": "修正・再提出" } },
    { "type": "arrow", "x": 110, "y": 110, "width": 220, "height": 50, "start": { "type": "rectangle", "id": "task_1" }, "end": { "type": "rectangle", "id": "task_2" } },
    { "type": "arrow", "x": 330, "y": 210, "width": 0, "height": 50, "start": { "type": "rectangle", "id": "task_2" }, "end": { "type": "diamond", "id": "task_3" } },
    { "type": "arrow", "x": 400, "y": 305, "width": 200, "height": 95, "start": { "type": "diamond", "id": "task_3" }, "end": { "type": "rectangle", "id": "task_4" }, "label": { "text": "Yes" } },
    { "type": "arrow", "x": 260, "y": 305, "width": -60, "height": 20, "start": { "type": "diamond", "id": "task_3" }, "end": { "type": "rectangle", "id": "task_5" }, "label": { "text": "No" } }
  ]
}

## Important
- ALWAYS create swim lane layout. Every task must be inside a stakeholder lane.
- Determine which stakeholder is responsible for each task from the flow description.
- Calculate lane height to fit all tasks: height = max(600, lastTaskY + 150).
- All lanes must have the SAME height.
- Keep task labels short and in the same language as the input.
- When modifying, preserve element IDs.

Only output the JSON object. Do not include explanations or markdown code blocks.`;

// Normalize arrow points and binding focus values
function normalizeLinearElements(elements: Record<string, unknown>[]) {
  for (const el of elements) {
    if (el.type !== "arrow" && el.type !== "line") continue;
    const points = el.points as number[][];
    if (!points || points.length < 2) continue;

    const [dx, dy] = points[0];
    if (dx !== 0 || dy !== 0) {
      el.x = (el.x as number) + dx;
      el.y = (el.y as number) + dy;
      el.points = points.map(([px, py]) => [px - dx, py - dy]);
    }

    const startBinding = el.startBinding as Record<string, unknown> | null;
    if (startBinding && typeof startBinding.focus === "number") {
      startBinding.focus = Math.max(-1, Math.min(1, startBinding.focus));
    }
    const endBinding = el.endBinding as Record<string, unknown> | null;
    if (endBinding && typeof endBinding.focus === "number") {
      endBinding.focus = Math.max(-1, Math.min(1, endBinding.focus));
    }
  }
}

let batchCounter = 0;

// Prefix IDs to avoid collisions across add operations
function prefixIds(
  skeletons: Record<string, unknown>[],
): Record<string, unknown>[] {
  const prefix = `b${++batchCounter}_`;
  const idMap = new Map<string, string>();

  for (const s of skeletons) {
    if (typeof s.id === "string") {
      idMap.set(s.id, prefix + s.id);
    }
  }

  return skeletons.map((s) => {
    const updated = { ...s };
    if (typeof updated.id === "string") {
      updated.id = idMap.get(updated.id) || updated.id;
    }
    if (updated.start && typeof updated.start === "object") {
      const start = updated.start as Record<string, unknown>;
      if (typeof start.id === "string" && idMap.has(start.id)) {
        updated.start = { ...start, id: idMap.get(start.id) };
      }
    }
    if (updated.end && typeof updated.end === "object") {
      const end = updated.end as Record<string, unknown>;
      if (typeof end.id === "string" && idMap.has(end.id)) {
        updated.end = { ...end, id: idMap.get(end.id) };
      }
    }
    return updated;
  });
}

// Parse JSON with repair for truncated AI output
function safeParseJSON(str: string): { action?: string; elements?: unknown[] } {
  try {
    return JSON.parse(str);
  } catch {
    // Try to salvage truncated JSON by extracting complete elements
    // Find the "elements" array start
    const elementsStart = str.indexOf('"elements"');
    if (elementsStart === -1) throw new Error("No elements found in output");

    const arrayStart = str.indexOf("[", elementsStart);
    if (arrayStart === -1) throw new Error("No elements array found");

    // Extract action if present
    const actionMatch = str.match(/"action"\s*:\s*"(\w+)"/);
    const action = actionMatch ? actionMatch[1] : "replace";

    // Find all complete JSON objects within the elements array
    const elements: unknown[] = [];
    let depth = 0;
    let objStart = -1;

    for (let i = arrayStart + 1; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"') {
        // Skip string content (handle escaped quotes)
        i++;
        while (i < str.length && str[i] !== '"') {
          if (str[i] === "\\") i++;
          i++;
        }
        continue;
      }
      if (ch === "{") {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objStart !== -1) {
          try {
            const obj = JSON.parse(str.slice(objStart, i + 1));
            elements.push(obj);
          } catch {
            // Skip malformed object
          }
          objStart = -1;
        }
      }
    }

    if (elements.length === 0) {
      throw new Error(
        "Could not extract any valid elements from truncated JSON",
      );
    }

    return { action, elements };
  }
}

export default function ExcalidrawFlowEditor({
  language,
  flowSection,
  stakeholderSection,
  initialData,
  configOverride,
  onSave,
  translations: t,
}: ExcalidrawFlowEditorProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const hasRestoredRef = useRef(false);
  const hasAutoGeneratedRef = useRef(false);

  // Dynamically load Excalidraw modules
  useEffect(() => {
    let mounted = true;
    (async () => {
      const mod = await import("@excalidraw/excalidraw");
      // @ts-expect-error CSS module import
      await import("@excalidraw/excalidraw/index.css");
      if (!mounted) return;
      Excalidraw = mod.Excalidraw;
      convertToExcalidrawElements = mod.convertToExcalidrawElements;
      restoreElements = mod.restoreElements;
      setIsReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Restore saved data when API is ready
  useEffect(() => {
    if (!api || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      api.updateScene({
        elements: initialData as Parameters<
          typeof api.updateScene
        >[0]["elements"],
      });
      setTimeout(() => {
        api.scrollToContent(
          initialData as Parameters<typeof api.scrollToContent>[0],
          { fitToViewport: true },
        );
      }, 100);
    }
  }, [api, initialData]);

  // Auto-generate on first open if no existing data
  useEffect(() => {
    if (
      api &&
      isReady &&
      !hasAutoGeneratedRef.current &&
      (!initialData || (Array.isArray(initialData) && initialData.length === 0))
    ) {
      hasAutoGeneratedRef.current = true;
      const autoPrompt =
        language === "ja"
          ? `以下の業務フローをスイムレーン形式のフロー図にしてください。\n\n## ステークホルダー\n${stakeholderSection || "（情報なし）"}\n\n## 業務フロー\n${flowSection}`
          : `Create a swim lane flow diagram from this business flow.\n\n## Stakeholders\n${stakeholderSection || "(none)"}\n\n## Business Flow\n${flowSection}`;
      handleGenerate(autoPrompt);
    }
  }, [api, isReady, initialData]);

  const handleAPIReady = useCallback(
    (excalidrawAPI: ExcalidrawImperativeAPI) => {
      setApi(excalidrawAPI);
    },
    [],
  );

  const getCanvasContext = useCallback((): string => {
    if (!api) return "";
    const elements = api.getSceneElements();
    if (!elements || elements.length === 0) return "Canvas is empty.";

    const limited = elements.slice(0, 50);
    const summary = limited.map((el) => {
      const base: Record<string, unknown> = {
        id: el.id,
        type: el.type,
        x: Math.round(el.x),
        y: Math.round(el.y),
        width: Math.round(el.width),
        height: Math.round(el.height),
      };
      const elAny = el as Record<string, unknown>;
      if (elAny.type === "text" && typeof elAny.text === "string") {
        base.text = elAny.text;
      }
      if (elAny.backgroundColor) base.backgroundColor = elAny.backgroundColor;
      return base;
    });

    return `${elements.length} elements on canvas:\n${JSON.stringify(summary, null, 1)}`;
  }, [api]);

  const applyElements = useCallback(
    (skeletons: unknown[], action: string) => {
      if (!api || !convertToExcalidrawElements || !restoreElements) return;

      const typed = skeletons as Record<string, unknown>[];
      const processedSkeletons = action === "add" ? prefixIds(typed) : typed;

      const rawElements = convertToExcalidrawElements(
        processedSkeletons as Parameters<typeof convertToExcalidrawElements>[0],
        { regenerateIds: false },
      );

      const cloned = JSON.parse(JSON.stringify(rawElements));
      normalizeLinearElements(cloned);
      const newElements = restoreElements(cloned, null, {
        refreshDimensions: false,
        repairBindings: true,
      });

      if (action === "replace") {
        api.updateScene({ elements: newElements });
      } else if (action === "modify") {
        const existing = api.getSceneElements();
        const incomingById = new Map<string, (typeof newElements)[number]>();
        for (const el of newElements) {
          if (el.id) incomingById.set(el.id, el);
        }
        const updatedElements = existing.map((el) => {
          const replacement = incomingById.get(el.id);
          if (replacement) {
            incomingById.delete(el.id);
            return replacement;
          }
          return el;
        });
        const remainingNew = Array.from(incomingById.values());
        api.updateScene({
          elements: [...updatedElements, ...remainingNew],
        });
      } else {
        const existing = api.getSceneElements();
        api.updateScene({ elements: [...existing, ...newElements] });
      }

      setTimeout(() => {
        api.scrollToContent(newElements, { fitToViewport: true });
      }, 100);
    },
    [api],
  );

  const handleGenerate = async (userInput: string) => {
    if (!api || isGenerating) return;
    setIsGenerating(true);

    try {
      const canvasContext = getCanvasContext();
      const prompt = canvasContext
        ? `Current Canvas State:\n${canvasContext}\n\nUser Request:\n${userInput}`
        : userInput;

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: prompt,
          systemPrompt: EXCALIDRAW_SYSTEM_PROMPT,
          temperature: 0.3,
          maxTokens: 8000,
          configOverride,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output?.trim();
        if (output) {
          // Strip markdown code fences if present
          let jsonStr = output;
          jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "");
          jsonStr = jsonStr.replace(/\n?```\s*$/, "");
          jsonStr = jsonStr.trim();

          // Attempt to repair truncated JSON (AI output may hit token limit)
          const parsed = safeParseJSON(jsonStr);
          const action = parsed.action || "replace";
          const elements = parsed.elements || [];
          if (elements.length > 0) {
            applyElements(elements, action);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate flow diagram:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!api) return;
    setIsSaving(true);
    try {
      const elements = api.getSceneElements();
      const serialized = JSON.parse(JSON.stringify(elements));
      await onSave(serialized);
    } catch (error) {
      console.error("Failed to save flow diagram:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (!api || !confirm(t.clearCanvasConfirm)) return;
    api.updateScene({ elements: [] });
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim() || isGenerating) return;
    handleGenerate(chatInput.trim());
    setChatInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-background flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            handleGenerate(
              language === "ja"
                ? `以下の業務フローをスイムレーン形式のフロー図にしてください。\n\n## ステークホルダー\n${stakeholderSection || "（情報なし）"}\n\n## 業務フロー\n${flowSection}`
                : `Create a swim lane flow diagram from this business flow.\n\n## Stakeholders\n${stakeholderSection || "(none)"}\n\n## Business Flow\n${flowSection}`,
            )
          }
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1" />
          )}
          {isGenerating ? t.generatingFlowDiagram : t.generateFlowDiagram}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t.clearCanvas}
        </Button>

        <div className="flex-1" />

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          {isSaving ? t.savingFlowDiagram : t.saveFlowDiagram}
        </Button>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 min-h-0 relative">
        {Excalidraw && (
          <Excalidraw
            excalidrawAPI={handleAPIReady}
            langCode={language === "ja" ? "ja-JP" : "en"}
          />
        )}
        {isGenerating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-sm">{t.generatingFlowDiagram}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat input for iterative modification */}
      <div className="flex items-center gap-2 p-2 border-t bg-background flex-shrink-0">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={t.flowDiagramChat}
          className="flex-1 h-9 px-3 border rounded-md text-sm bg-background"
          disabled={isGenerating}
        />
        <Button
          variant="primary"
          size="icon"
          onClick={handleChatSubmit}
          disabled={!chatInput.trim() || isGenerating}
          className="h-9 w-9 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
