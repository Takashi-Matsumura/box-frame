"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  language?: "en" | "ja";
}

const labels = {
  en: {
    1: "Not Achieved",
    2: "Partially Achieved",
    3: "Moderately Achieved",
    4: "Well Achieved",
    5: "Fully Achieved",
  },
  ja: {
    1: "達成できなかった",
    2: "あまり達成できなかった",
    3: "ある程度達成できた",
    4: "十分達成できた",
    5: "大きく達成できた",
  },
} as const;

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  showLabel = true,
  language = "ja",
}: StarRatingProps) {
  const handleClick = (rating: number) => {
    if (disabled || !onChange) return;
    onChange(rating);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (disabled || !onChange) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(rating);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onKeyDown={(e) => handleKeyDown(e, rating)}
            disabled={disabled}
            className={cn(
              "p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded",
              !disabled && "cursor-pointer hover:scale-110",
              disabled && "cursor-default"
            )}
            aria-label={`${rating} stars`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                value !== null && rating <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && value !== null && (
        <span className="text-sm text-muted-foreground">
          {labels[language][value as keyof (typeof labels)["ja"]]}
        </span>
      )}
    </div>
  );
}
