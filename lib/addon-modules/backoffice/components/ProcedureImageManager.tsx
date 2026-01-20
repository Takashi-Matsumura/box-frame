"use client";

import {
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface ProcedureImage {
  id: string;
  workProcedureId: string;
  filename: string;
  originalName: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ProcedureImageManagerProps {
  procedureId: string;
  images: ProcedureImage[];
  language: "en" | "ja";
  onImagesChange: (images: ProcedureImage[]) => void;
  onInsertToMarkdown: (markdown: string) => void;
}

const translations = {
  en: {
    images: "Images",
    uploadImage: "Upload Image",
    dropHere: "Drop files here or click to upload",
    supportedFormats: "JPEG, PNG, GIF, WebP (max 5MB)",
    caption: "Caption",
    captionPlaceholder: "Enter image caption...",
    insertToMarkdown: "Insert",
    delete: "Delete",
    maxImages: "Maximum 10 images per procedure",
    uploading: "Uploading...",
    noImages: "No images uploaded",
    dragToReorder: "Drag to reorder",
  },
  ja: {
    images: "画像",
    uploadImage: "画像をアップロード",
    dropHere: "ファイルをドロップまたはクリックしてアップロード",
    supportedFormats: "JPEG, PNG, GIF, WebP（最大5MB）",
    caption: "キャプション",
    captionPlaceholder: "画像の説明を入力...",
    insertToMarkdown: "挿入",
    delete: "削除",
    maxImages: "画像は手順書あたり最大10枚です",
    uploading: "アップロード中...",
    noImages: "画像がアップロードされていません",
    dragToReorder: "ドラッグで順序を変更",
  },
};

export function ProcedureImageManager({
  procedureId,
  images,
  language,
  onImagesChange,
  onInsertToMarkdown,
}: ProcedureImageManagerProps) {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 認証付きAPI経由で画像を取得
  const getImageUrl = useCallback(
    (image: ProcedureImage) =>
      `/api/backoffice/procedures/${procedureId}/images/${image.id}/file`,
    [procedureId]
  );

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      if (images.length >= 10) {
        alert(t.maxImages);
        return;
      }

      setIsUploading(true);

      try {
        for (const file of Array.from(files)) {
          if (images.length >= 10) break;

          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(
            `/api/backoffice/procedures/${procedureId}/images`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (response.ok) {
            const data = await response.json();
            onImagesChange([...images, data.image]);
          }
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [procedureId, images, onImagesChange, t.maxImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDelete = useCallback(
    async (imageId: string) => {
      try {
        const response = await fetch(
          `/api/backoffice/procedures/${procedureId}/images/${imageId}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          onImagesChange(images.filter((img) => img.id !== imageId));
        }
      } catch (error) {
        console.error("Failed to delete image:", error);
      }
    },
    [procedureId, images, onImagesChange]
  );

  const handleCaptionSave = useCallback(
    async (imageId: string) => {
      try {
        const response = await fetch(
          `/api/backoffice/procedures/${procedureId}/images/${imageId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caption: captionValue }),
          }
        );

        if (response.ok) {
          onImagesChange(
            images.map((img) =>
              img.id === imageId ? { ...img, caption: captionValue } : img
            )
          );
        }
      } catch (error) {
        console.error("Failed to update caption:", error);
      } finally {
        setEditingCaptionId(null);
        setCaptionValue("");
      }
    },
    [procedureId, images, captionValue, onImagesChange]
  );

  const handleInsertToMarkdown = useCallback(
    (image: ProcedureImage) => {
      const url = getImageUrl(image);
      const alt = image.caption || image.originalName;
      const markdown = `![${alt}](${url})`;
      onInsertToMarkdown(markdown);
    },
    [getImageUrl, onInsertToMarkdown]
  );

  const handleDragStart = useCallback(
    (index: number) => {
      setDraggedIndex(index);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleDragOverItem = useCallback(
    async (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const newImages = [...images];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, draggedImage);

      // Update local state immediately for responsiveness
      onImagesChange(newImages);
      setDraggedIndex(targetIndex);

      // Sync with server
      try {
        await fetch(
          `/api/backoffice/procedures/${procedureId}/images/reorder`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageIds: newImages.map((img) => img.id),
            }),
          }
        );
      } catch (error) {
        console.error("Failed to reorder images:", error);
      }
    },
    [draggedIndex, images, procedureId, onImagesChange]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-muted-foreground/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t.uploading}</span>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t.dropHere}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.supportedFormats}
            </p>
          </>
        )}
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <ImagePlus className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">{t.noImages}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">{t.dragToReorder}</p>
          <div className="grid grid-cols-2 gap-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverItem(e, index)}
                className={`group relative border rounded-lg overflow-hidden bg-muted/30 transition-opacity ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-video relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(image)}
                    alt={image.caption || image.originalName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Drag Handle */}
                  <div className="absolute top-1 left-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>

                {/* Caption & Actions */}
                <div className="p-2">
                  {editingCaptionId === image.id ? (
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border rounded bg-background"
                      value={captionValue}
                      onChange={(e) => setCaptionValue(e.target.value)}
                      onBlur={() => handleCaptionSave(image.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCaptionSave(image.id);
                        if (e.key === "Escape") {
                          setEditingCaptionId(null);
                          setCaptionValue("");
                        }
                      }}
                      placeholder={t.captionPlaceholder}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-xs text-muted-foreground truncate cursor-pointer hover:text-foreground"
                      onClick={() => {
                        setEditingCaptionId(image.id);
                        setCaptionValue(image.caption || "");
                      }}
                    >
                      {image.caption || t.captionPlaceholder}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleInsertToMarkdown(image)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {t.insertToMarkdown}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(image.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
