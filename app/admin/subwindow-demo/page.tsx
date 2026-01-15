"use client";

import { Button } from "@/components/ui";
import { FloatingWindow } from "@/components/ui/floating-window";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";

export default function SubWindowDemoPage() {
  const { open, isOpen } = useFloatingWindowStore();

  const handleOpenWindow = () => {
    open({
      title: "Demo Window",
      titleJa: "デモウィンドウ",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is a floating sub window demo.
          </p>
          <p className="text-muted-foreground">
            これはフローティングサブウィンドウのデモです。
          </p>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Features / 機能</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Drag title bar to move / タイトルバーをドラッグで移動</li>
              <li>Resize from edges and corners / 端と角からリサイズ</li>
              <li>Minimize, maximize, close / 最小化、最大化、閉じる</li>
              <li>ESC key to close / ESCキーで閉じる</li>
              <li>
                Double-click title to maximize / タイトルダブルクリックで最大化
              </li>
            </ul>
          </div>
          <div className="p-4 bg-accent/50 rounded-lg">
            <h4 className="font-semibold mb-2">Note / 注意</h4>
            <p className="text-sm text-muted-foreground">
              This window can be used simultaneously with the main content area.
              <br />
              このウィンドウはメインコンテンツエリアと同時に操作できます。
            </p>
          </div>
        </div>
      ),
      initialPosition: { x: 200, y: 150 },
      initialSize: { width: 450, height: 400 },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Sub Window Demo</h1>
        <p className="text-muted-foreground">
          フローティングサブウィンドウのデモンストレーションページです。
        </p>
      </div>

      <div className="space-y-4">
        <Button onClick={handleOpenWindow} disabled={isOpen}>
          {isOpen ? "Window is Open" : "Open Sub Window"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {isOpen
            ? "サブウィンドウが開いています。閉じるボタンまたはESCキーで閉じてください。"
            : "ボタンをクリックしてサブウィンドウを開いてください。"}
        </p>
      </div>

      {/* メイン画面のコンテンツ（同時操作のデモ） */}
      <div className="p-6 bg-muted rounded-lg">
        <h2 className="font-semibold mb-4">
          Main Content Area / メインコンテンツエリア
        </h2>
        <p className="text-muted-foreground mb-4">
          サブウィンドウが開いている間も、このエリアは操作可能です。
          <br />
          The buttons below can be clicked while the sub window is open.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => alert("Button 1 clicked!")}>
            Test Button 1
          </Button>
          <Button variant="outline" onClick={() => alert("Button 2 clicked!")}>
            Test Button 2
          </Button>
        </div>
      </div>

      {/* 追加のデモコンテンツ */}
      <div className="p-6 border border-border rounded-lg">
        <h2 className="font-semibold mb-4">
          Additional Controls / 追加コントロール
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => {
                open({
                  title: "Small Window",
                  titleJa: "小さいウィンドウ",
                  content: (
                    <p className="text-muted-foreground">Small content</p>
                  ),
                  initialSize: { width: 300, height: 200 },
                  initialPosition: { x: 100, y: 100 },
                });
              }}
              disabled={isOpen}
            >
              Open Small
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                open({
                  title: "Large Window",
                  titleJa: "大きいウィンドウ",
                  content: (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        This is a larger window with more content.
                      </p>
                      <div className="h-40 bg-accent/30 rounded flex items-center justify-center">
                        Large content area
                      </div>
                    </div>
                  ),
                  initialSize: { width: 600, height: 500 },
                  initialPosition: { x: 150, y: 100 },
                });
              }}
              disabled={isOpen}
            >
              Open Large
            </Button>
          </div>
        </div>
      </div>

      {/* FloatingWindowコンポーネント */}
      <FloatingWindow language="ja" />
    </div>
  );
}
