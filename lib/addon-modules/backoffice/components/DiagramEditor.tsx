"use client";

import { useMemo } from "react";
import { DrawIoEmbed } from "react-drawio";

interface DiagramEditorProps {
  xml?: string;
  onChange?: (xml: string) => void;
  className?: string;
}

export function DiagramEditor({ xml, onChange, className }: DiagramEditorProps) {
  // XMLが変わるたびに新しいキーを生成してコンポーネントを再マウント
  const editorKey = useMemo(() => {
    return xml ? `editor-${Date.now()}` : "editor-empty";
  }, [xml]);

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
