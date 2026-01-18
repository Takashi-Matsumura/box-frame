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
    const key = xml ? `editor-${Date.now()}` : "editor-empty";
    console.log("=== DiagramEditor ===");
    console.log("Key:", key);
    console.log("XML length:", xml?.length || 0);
    console.log("XML preview:", xml?.substring(0, 200));
    return key;
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
