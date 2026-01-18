"use client";

import { DrawIoEmbed } from "react-drawio";

interface DiagramEditorProps {
  xml?: string;
  loadKey?: number; // XMLを再読み込みしたい時にインクリメント
  onChange?: (xml: string) => void;
  className?: string;
}

export function DiagramEditor({ xml, loadKey = 0, onChange, className }: DiagramEditorProps) {
  // loadKeyが変わった時のみ再マウント（AI生成時など）
  // autosaveによる変更では再マウントしない
  const editorKey = `editor-${loadKey}`;

  return (
    <div className={className || "w-full h-full"}>
      <DrawIoEmbed
        key={editorKey}
        xml={xml || ""}
        autosave={true}
        urlParameters={{
          ui: "kennedy",
          spin: true,
          libraries: true,
          saveAndExit: false,
          noSaveBtn: true,
          noExitBtn: true,
        }}
        onAutoSave={(data) => {
          if (onChange && data.xml) {
            onChange(data.xml);
          }
        }}
      />
    </div>
  );
}
