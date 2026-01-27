"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Save, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagramEditor } from "./DiagramEditor";
import {
  generateFlowDiagramXml,
  parseFlowDiagramJson,
  sanitizeXmlAttributeValues,
} from "../utils/diagram-utils";

interface Actor {
  id: string;
  name: string;
  department?: string;
}

interface DiagramEditorWithAIProps {
  xml?: string;
  flowDescription?: string;
  actors?: Actor[];
  onChange?: (xml: string) => void;
  onSave?: (xml: string) => Promise<boolean>;
  language: "en" | "ja";
  className?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const translations = {
  en: {
    aiAssistant: "AI Assistant",
    generateFromFlow: "Generate Business Flow",
    generating: "Generating...",
    inputPlaceholder: "Describe what you want to create or modify...",
    send: "Send",
    aiThinking: "AI is generating diagram...",
    noFlowDescription: "No flow description available. Please complete the AI hearing first.",
    quickActions: "Quick Actions",
    addStartEnd: "Add Start/End",
    addProcess: "Add Process Step",
    addDecision: "Add Decision",
    improveLayout: "Improve Layout",
    generatedSuccess: "Business flow diagram generated successfully!",
    modifiedSuccess: "Diagram modified successfully!",
    actors: "Actors",
    saveDiagram: "Save Diagram",
    saving: "Saving...",
    saved: "Diagram saved!",
  },
  ja: {
    aiAssistant: "AIアシスタント",
    generateFromFlow: "業務フロー図を生成",
    generating: "生成中...",
    inputPlaceholder: "作成・修正したい内容を入力...",
    send: "送信",
    aiThinking: "AIが業務フロー図を生成中...",
    noFlowDescription: "フロー説明がありません。まずAIヒアリングを完了してください。",
    quickActions: "クイックアクション",
    addStartEnd: "開始/終了を追加",
    addProcess: "処理を追加",
    addDecision: "分岐を追加",
    improveLayout: "レイアウト改善",
    generatedSuccess: "業務フロー図を生成しました！",
    modifiedSuccess: "図を修正しました！",
    actors: "アクター",
    saveDiagram: "図を保存",
    saving: "保存中...",
    saved: "保存しました！",
  },
};

export function DiagramEditorWithAI({
  xml,
  flowDescription,
  actors = [],
  onChange,
  onSave,
  language,
  className,
}: DiagramEditorWithAIProps) {
  const t = translations[language];
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentXml, setCurrentXml] = useState(xml || "");
  const [loadKey, setLoadKey] = useState(0); // AI生成時にインクリメントしてエディタを再マウント
  const [isComposing, setIsComposing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [inputMessage]);

  const handleXmlChange = useCallback(
    (newXml: string) => {
      setCurrentXml(newXml);
      onChange?.(newXml);
    },
    [onChange]
  );

  const handleSave = useCallback(async () => {
    if (!onSave || !currentXml) return;
    setIsSaving(true);
    try {
      const success = await onSave(currentXml);
      if (success) {
        const savedMessage: ChatMessage = {
          role: "assistant",
          content: t.saved,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, savedMessage]);
      }
    } finally {
      setIsSaving(false);
    }
  }, [onSave, currentXml, t.saved]);

  // 2段階生成: Phase 1用のJSON生成プロンプト
  const getFlowDiagramJsonPrompt = () => {
    const actorsList = actors.length > 0
      ? actors.map((a, i) => `${i}. ${a.name}${a.department ? ` (${a.department})` : ""}`).join("\n")
      : "（アクター情報なし - 業務フローから適切なアクターを抽出してください）";

    return `あなたは業務フロー分析のエキスパートです。
以下の業務フロー説明を分析し、スイムレーン形式の業務フロー図を作成するための構造化JSONを出力してください。

## アクター候補（インデックス番号で参照）
${actorsList}

## 出力形式（JSON）

\`\`\`json
{
  "actors": ["アクター1", "アクター2", "アクター3"],
  "steps": [
    {"id": "step1", "actor": 0, "label": "処理名", "type": "process"},
    {"id": "step2", "actor": 1, "label": "処理名", "type": "process"}
  ],
  "connections": [
    {"from": "step1", "to": "step2", "label": "データ名", "type": "flow"}
  ]
}
\`\`\`

## フィールド説明

### actors（必須）
- 業務に関わるアクター（役割・担当者）の配列
- 左から右へ並ぶ順序で指定
- 上記のアクター候補がある場合はそれを使用、なければ業務フローから抽出

### steps（必須）
- id: 一意のステップID（step1, step2, ...）
- actor: そのステップを実行するアクターのインデックス（0始まり）
- label: ステップの表示名（短く簡潔に）
- type: ステップの種類
  - "start": 開始（緑の楕円）
  - "end": 終了（赤の楕円）
  - "process": 処理（青の角丸長方形）- デフォルト
  - "decision": 分岐・判断（黄のひし形）
  - "data": 伝達データ（紫の角丸長方形）
  - "database": DB・蓄積データ（円筒）

### connections（必須）
- from: 接続元のステップID
- to: 接続先のステップID
- label: 矢印に表示するラベル（省略可）
- type: 接続の種類
  - "flow": 作業の流れ（実線矢印）- デフォルト
  - "data": データの流れ（点線矢印）

## 生成ルール
1. 主要なステップのみに絞る（最大8ステップ程度）
2. ステップは時系列順に並べる
3. 各ステップは必ずいずれかのアクターに属する
4. 接続は業務の流れを表現（必要に応じてラベルを付ける）
5. 開始・終了は必須ではない（省略可）

## 注意
- JSONのみを出力してください
- 説明文は不要です
- 必ず有効なJSONを出力してください`;
  };

  // 2段階生成アプローチ: Phase 1でJSON取得、Phase 2でXML生成
  const generateDiagramFromFlow = async () => {
    if (!flowDescription || isGenerating) return;

    setIsGenerating(true);
    const userMessage: ChatMessage = {
      role: "user",
      content: language === "ja"
        ? "業務フローからシーケンス図を生成してください。"
        : "Generate a sequence diagram from the business flow.",
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      // Phase 1: AIにJSONを生成させる
      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: flowDescription,
          systemPrompt: getFlowDiagramJsonPrompt(),
          temperature: 0.3,
          maxTokens: 4096,  // JSONはXMLより小さいので十分
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const output = data.output || "";

      console.log("AI JSON output:", output);

      // Phase 2: JSONをパースしてXMLを生成
      const flowData = parseFlowDiagramJson(output);

      if (!flowData) {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: language === "ja"
            ? `業務フローの解析に失敗しました。もう一度お試しください。\n\n出力: ${output.substring(0, 500)}`
            : `Failed to parse business flow. Please try again.\n\nOutput: ${output.substring(0, 500)}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
        return;
      }

      console.log("Parsed flow data:", flowData);

      // JSONからXMLを生成（プログラムで生成するので常に有効なXML）
      const generatedXml = generateFlowDiagramXml(flowData);

      console.log("Generated XML:", generatedXml);

      setCurrentXml(generatedXml);
      onChange?.(generatedXml);
      setLoadKey((prev) => prev + 1);

      const successMessage: ChatMessage = {
        role: "assistant",
        content: t.generatedSuccess,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, successMessage]);

    } catch (error) {
      console.error("Failed to generate diagram:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: language === "ja"
          ? "エラーが発生しました。もう一度お試しください。"
          : "An error occurred. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // チャットによる図の修正（2段階生成アプローチ）
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsGenerating(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // 修正用のプロンプト
      const modifyPrompt = `${getFlowDiagramJsonPrompt()}

## 追加の指示
ユーザーが以下の修正を依頼しています。元の業務フローを参考に、修正を反映したJSONを出力してください。

### 修正依頼
${inputMessage}

${flowDescription ? `### 元の業務フロー説明\n${flowDescription}` : ""}`;

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: inputMessage,
          systemPrompt: modifyPrompt,
          temperature: 0.3,
          maxTokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const output = data.output || "";

      console.log("AI modification output:", output);

      // JSONをパースしてXMLを生成
      const flowData = parseFlowDiagramJson(output);

      if (flowData) {
        const generatedXml = generateFlowDiagramXml(flowData);
        setCurrentXml(generatedXml);
        onChange?.(generatedXml);
        setLoadKey((prev) => prev + 1);

        const successMessage: ChatMessage = {
          role: "assistant",
          content: t.modifiedSuccess,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, successMessage]);
      } else {
        // JSONパースに失敗した場合は、AIの応答をそのまま表示
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: output,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to process request:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: language === "ja"
          ? "エラーが発生しました。もう一度お試しください。"
          : "An error occurred. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex h-full ${className || ""}`}>
      {/* AI Chat Panel */}
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-sm">{t.aiAssistant}</span>
          </div>
          {onSave && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !currentXml}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  {t.saveDiagram}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Actors Display */}
        {actors.length > 0 && (
          <div className="p-3 border-b bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t.actors}</p>
            <div className="flex flex-wrap gap-1">
              {actors.map((actor, i) => (
                <span
                  key={actor.id || i}
                  className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full"
                >
                  {actor.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Generate from Flow Button */}
        {flowDescription && (
          <div className="p-3 border-b">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={generateDiagramFromFlow}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? t.generating : t.generateFromFlow}
            </Button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {flowDescription ? (
                <p>
                  {language === "ja"
                    ? "「シーケンス図を生成」ボタンでスイムレーン形式の図を自動生成できます。または、下の入力欄でAIに指示を出せます。"
                    : "Click 'Generate Sequence Diagram' to auto-generate a swimlane diagram, or type instructions below."}
                </p>
              ) : (
                <p>{t.noFlowDescription}</p>
              )}
            </div>
          )}
          {chatMessages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{t.aiThinking}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={t.inputPlaceholder}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[100px]"
              rows={1}
              disabled={isGenerating}
            />
            <Button
              variant="primary"
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isGenerating}
              className="h-10 w-10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Diagram Editor */}
      <div className="flex-1">
        <DiagramEditor
          xml={currentXml}
          loadKey={loadKey}
          onChange={handleXmlChange}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
