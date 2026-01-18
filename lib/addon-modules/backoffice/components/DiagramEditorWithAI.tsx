"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagramEditor } from "./DiagramEditor";

interface DiagramEditorWithAIProps {
  xml?: string;
  flowDescription?: string;
  onChange?: (xml: string) => void;
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
    generateFromFlow: "Generate from Flow Description",
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
    generatedSuccess: "Diagram generated successfully!",
    modifiedSuccess: "Diagram modified successfully!",
  },
  ja: {
    aiAssistant: "AIアシスタント",
    generateFromFlow: "フロー説明から生成",
    generating: "生成中...",
    inputPlaceholder: "作成・修正したい内容を入力...",
    send: "送信",
    aiThinking: "AIがフロー図を生成中...",
    noFlowDescription: "フロー説明がありません。まずAIヒアリングを完了してください。",
    quickActions: "クイックアクション",
    addStartEnd: "開始/終了を追加",
    addProcess: "処理を追加",
    addDecision: "分岐を追加",
    improveLayout: "レイアウト改善",
    generatedSuccess: "フロー図を生成しました！",
    modifiedSuccess: "フロー図を修正しました！",
  },
};

export function DiagramEditorWithAI({
  xml,
  flowDescription,
  onChange,
  language,
  className,
}: DiagramEditorWithAIProps) {
  const t = translations[language];
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentXml, setCurrentXml] = useState(xml || "");
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

  const generateDiagramFromFlow = async () => {
    if (!flowDescription || isGenerating) return;

    setIsGenerating(true);
    const userMessage: ChatMessage = {
      role: "user",
      content: language === "ja"
        ? "フロー説明からフロー図を生成してください。"
        : "Generate a flow diagram from the flow description.",
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: flowDescription,
          systemPrompt: `あなたはdraw.io用のフロー図XMLを生成するエキスパートです。
以下の業務フロー説明を読んで、draw.io形式のmxGraphModel XMLを生成してください。

## 重要：正確なXML形式
以下の例を厳密に守ってください。

\`\`\`xml
<mxGraphModel dx="1000" dy="600" grid="1" gridSize="10">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="start" value="開始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
      <mxGeometry x="200" y="20" width="100" height="50" as="geometry"/>
    </mxCell>
    <mxCell id="step1" value="処理1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
      <mxGeometry x="200" y="100" width="100" height="50" as="geometry"/>
    </mxCell>
    <mxCell id="edge1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="start" target="step1">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
\`\`\`

## 必須ルール（厳守）
1. 全てのノード（図形）には vertex="1" と parent="1" が必須
2. 全てのノードには <mxGeometry x="..." y="..." width="..." height="..." as="geometry"/> が必須
3. 矢印は edge="1" を持つ mxCell で、source と target でノードを接続
4. id="0" と id="1" のセルは必ず最初に配置

## レイアウト
- y座標: 開始=20, 以降は80ずつ増加（20, 100, 180, 260...）
- x座標: 200で固定
- width=100, height=50

## スタイル
- 開始/終了: ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;
- 処理: rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;
- 分岐: rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;

## 生成時の注意
- 主要なステップのみを抽出し、5〜8個程度のノードに収める
- 複雑な分岐は簡略化する
- 開始→処理→終了の流れを基本とする

XMLのみを出力し、説明文は不要です。`,
          temperature: 0.3,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        // XMLを抽出（```xml...```形式または直接XMLの両方に対応）
        const xmlMatch = output.match(/```xml\s*([\s\S]*?)\s*```/);
        const extractedXml = xmlMatch ? xmlMatch[1].trim() : output;

        // デバッグ用ログ
        console.log("=== AI Output ===");
        console.log(output);
        console.log("=== Extracted XML ===");
        console.log(extractedXml);

        if (extractedXml.includes("<mxGraphModel") || extractedXml.includes("<mxCell")) {
          console.log("=== XML Valid, updating editor ===");
          handleXmlChange(extractedXml);
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
              ? "フロー図の生成に失敗しました。もう一度お試しください。"
              : "Failed to generate diagram. Please try again.",
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
          input: `現在のフロー図XML:
${currentXml || "(空)"}

ユーザーの指示:
${inputMessage}

${flowDescription ? `参考：業務フロー説明\n${flowDescription}` : ""}`,
          systemPrompt: `あなたはdraw.io用のフロー図XMLを修正・改善するエキスパートです。

## 重要：正確なXML形式
以下の形式を厳密に守ってください。

\`\`\`xml
<mxGraphModel dx="1000" dy="600" grid="1" gridSize="10">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="start" value="開始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
      <mxGeometry x="200" y="20" width="100" height="50" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
\`\`\`

## 必須ルール
1. 全てのノードには vertex="1" と parent="1" が必須
2. 全てのノードには <mxGeometry x="..." y="..." width="..." height="..." as="geometry"/> が必須
3. 矢印は edge="1" を持つ mxCell で、source と target を指定

XMLのみを出力し、説明文は不要です。`,
          temperature: 0.3,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        const xmlMatch = output.match(/```xml\s*([\s\S]*?)\s*```/);
        const extractedXml = xmlMatch ? xmlMatch[1].trim() : output;

        if (extractedXml.includes("<mxGraphModel") || extractedXml.includes("<mxCell")) {
          handleXmlChange(extractedXml);
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
        <div className="p-3 border-b flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-sm">{t.aiAssistant}</span>
        </div>

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
                    ? "「フロー説明から生成」ボタンでフロー図を自動生成できます。または、下の入力欄でAIに指示を出せます。"
                    : "Click 'Generate from Flow Description' to auto-generate, or type instructions below."}
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
          onChange={handleXmlChange}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
