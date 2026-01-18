"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Save, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagramEditor } from "./DiagramEditor";

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
    generateFromFlow: "Generate Sequence Diagram",
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
    generatedSuccess: "Sequence diagram generated successfully!",
    modifiedSuccess: "Diagram modified successfully!",
    actors: "Actors",
    saveDiagram: "Save Diagram",
    saving: "Saving...",
    saved: "Diagram saved!",
  },
  ja: {
    aiAssistant: "AIアシスタント",
    generateFromFlow: "シーケンス図を生成",
    generating: "生成中...",
    inputPlaceholder: "作成・修正したい内容を入力...",
    send: "送信",
    aiThinking: "AIがシーケンス図を生成中...",
    noFlowDescription: "フロー説明がありません。まずAIヒアリングを完了してください。",
    quickActions: "クイックアクション",
    addStartEnd: "開始/終了を追加",
    addProcess: "処理を追加",
    addDecision: "分岐を追加",
    improveLayout: "レイアウト改善",
    generatedSuccess: "シーケンス図を生成しました！",
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

  // スイムレーン形式のシーケンス図生成プロンプト（縦書き：アクターが横に並ぶ）
  const getSequenceDiagramPrompt = () => {
    const actorsList = actors.length > 0
      ? actors.map((a, i) => `${i + 1}. ${a.name}${a.department ? ` (${a.department})` : ""}`).join("\n")
      : "（アクター情報なし）";

    return `あなたはdraw.io用のスイムレーン形式シーケンス図XMLを生成するエキスパートです。
以下の業務フロー説明とアクター情報を読んで、draw.io形式のmxGraphModel XMLを生成してください。

## アクター（スイムレーンとして横に並べる）
${actorsList}

## 重要：縦書きスイムレーン形式シーケンス図のXML構造

\`\`\`xml
<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>

    <!-- スイムレーン（横に並べる、縦方向にフローが流れる） -->
    <mxCell id="lane1" value="アクター1" style="swimlane;horizontal=1;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="180" height="500" as="geometry"/>
    </mxCell>
    <mxCell id="lane2" value="アクター2" style="swimlane;horizontal=1;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;" vertex="1" parent="1">
      <mxGeometry x="230" y="50" width="180" height="500" as="geometry"/>
    </mxCell>
    <mxCell id="lane3" value="アクター3" style="swimlane;horizontal=1;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;" vertex="1" parent="1">
      <mxGeometry x="410" y="50" width="180" height="500" as="geometry"/>
    </mxCell>

    <!-- 処理ステップ（各レーン内に上から下へ配置） -->
    <mxCell id="step1" value="処理1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="lane1">
      <mxGeometry x="40" y="50" width="100" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="step2" value="処理2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="lane2">
      <mxGeometry x="40" y="120" width="100" height="40" as="geometry"/>
    </mxCell>

    <!-- アクター間の矢印（横方向に流れる） -->
    <mxCell id="msg1" value="依頼" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;endFill=1;" edge="1" parent="1" source="step1" target="step2">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
\`\`\`

## 縦書きスイムレーン配置ルール
1. 各アクターを横に並べたスイムレーンとして配置（horizontal=1）
2. レーン幅: 180px、高さ: 500px
3. レーン間隔: x座標を180pxずつ増加（50, 230, 410, 590...）
4. 処理ステップはレーン内に上から下へ配置（y座標を増加させる: 50, 120, 190, 260...）
5. アクター間のやり取りは横方向の矢印（edge）で表現
6. 時系列は上から下へ流れる

## スタイル
- スイムレーン: swimlane;horizontal=1;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;
- 処理: rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;
- 判断: rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;
- 開始: ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;
- 終了: ellipse;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;
- 矢印: edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;endFill=1;

## 生成時の注意
- 必ずアクター数分のスイムレーンを横に並べて作成
- 業務フローの各ステップを上から下へ配置（y座標を70pxずつ増加）
- アクター間のコミュニケーションは横方向の矢印で表現
- 時系列は上から下へ流れるように配置
- 複雑すぎる場合は主要なステップに絞る（5〜8ステップ程度）

XMLのみを出力し、説明文は不要です。`;
  };

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
      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: flowDescription,
          systemPrompt: getSequenceDiagramPrompt(),
          temperature: 0.3,
          maxTokens: 6000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        // XMLを抽出（```xml...```形式または直接XMLの両方に対応）
        const xmlMatch = output.match(/```xml\s*([\s\S]*?)\s*```/);
        const extractedXml = xmlMatch ? xmlMatch[1].trim() : output;

        if (extractedXml.includes("<mxGraphModel") || extractedXml.includes("<mxCell")) {
          setCurrentXml(extractedXml);
          onChange?.(extractedXml);
          setLoadKey((prev) => prev + 1); // エディタを再マウントして新しいXMLを読み込む
          const successMessage: ChatMessage = {
            role: "assistant",
            content: t.generatedSuccess,
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, successMessage]);
        } else {
          const errorMessage: ChatMessage = {
            role: "assistant",
            content: language === "ja"
              ? "シーケンス図の生成に失敗しました。もう一度お試しください。"
              : "Failed to generate sequence diagram. Please try again.",
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      }
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
      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `現在のシーケンス図XML:
${currentXml || "(空)"}

ユーザーの指示:
${inputMessage}

${flowDescription ? `参考：業務フロー説明\n${flowDescription}` : ""}

${actors.length > 0 ? `アクター一覧:\n${actors.map((a, i) => `${i + 1}. ${a.name}`).join("\n")}` : ""}`,
          systemPrompt: getSequenceDiagramPrompt(),
          temperature: 0.3,
          maxTokens: 6000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        const xmlMatch = output.match(/```xml\s*([\s\S]*?)\s*```/);
        const extractedXml = xmlMatch ? xmlMatch[1].trim() : output;

        if (extractedXml.includes("<mxGraphModel") || extractedXml.includes("<mxCell")) {
          setCurrentXml(extractedXml);
          onChange?.(extractedXml);
          setLoadKey((prev) => prev + 1); // エディタを再マウントして新しいXMLを読み込む
          const successMessage: ChatMessage = {
            role: "assistant",
            content: t.modifiedSuccess,
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, successMessage]);
        } else {
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: output,
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, assistantMessage]);
        }
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
