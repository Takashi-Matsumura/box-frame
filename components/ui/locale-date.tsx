"use client";

/**
 * Locale-aware Date/Time Display Components
 *
 * ## Why these components exist
 *
 * `toLocaleDateString()` and `toLocaleTimeString()` can produce different
 * output between Node.js (server) and browser (client) environments, even
 * with the same locale settings. This causes React hydration errors:
 *
 * - Server (Node.js): "2026年2月5日木曜日" (no space)
 * - Client (Safari): "2026年2月5日 木曜日" (with space)
 *
 * These components wrap the formatted output with `suppressHydrationWarning`
 * to prevent React from throwing errors due to these expected differences.
 *
 * ## Usage
 *
 * ```tsx
 * // Instead of:
 * <p>{new Date().toLocaleDateString("ja-JP", { weekday: "long", ... })}</p>
 *
 * // Use:
 * <LocaleDate date={new Date()} locale="ja-JP" options={{ weekday: "long", ... }} />
 * ```
 *
 * @see https://nextjs.org/docs/messages/react-hydration-error
 */

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LocaleDateProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The date to format */
  date: Date | string | number;
  /** Locale string (e.g., "ja-JP", "en-US") */
  locale?: string;
  /** Intl.DateTimeFormatOptions for formatting */
  options?: Intl.DateTimeFormatOptions;
  /** HTML tag to render (default: "span") */
  as?: "span" | "p" | "div" | "time" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

/**
 * Locale-aware date display component with hydration warning suppression.
 *
 * @example
 * ```tsx
 * <LocaleDate
 *   date={new Date()}
 *   locale="ja-JP"
 *   options={{ year: "numeric", month: "long", day: "numeric", weekday: "long" }}
 * />
 * ```
 */
export function LocaleDate({
  date,
  locale = "ja-JP",
  options,
  as: Tag = "span",
  className,
  ...props
}: LocaleDateProps) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const formatted = dateObj.toLocaleDateString(locale, options);

  return (
    <Tag
      className={cn(className)}
      suppressHydrationWarning
      {...props}
    >
      {formatted}
    </Tag>
  );
}

interface LocaleTimeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The date/time to format */
  date: Date | string | number;
  /** Locale string (e.g., "ja-JP", "en-US") */
  locale?: string;
  /** Intl.DateTimeFormatOptions for formatting */
  options?: Intl.DateTimeFormatOptions;
  /** HTML tag to render (default: "span") */
  as?: "span" | "p" | "div" | "time";
}

/**
 * Locale-aware time display component with hydration warning suppression.
 *
 * @example
 * ```tsx
 * <LocaleTime
 *   date={event.startTime}
 *   locale="ja-JP"
 *   options={{ hour: "2-digit", minute: "2-digit" }}
 * />
 * ```
 */
export function LocaleTime({
  date,
  locale = "ja-JP",
  options = { hour: "2-digit", minute: "2-digit" },
  as: Tag = "span",
  className,
  ...props
}: LocaleTimeProps) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const formatted = dateObj.toLocaleTimeString(locale, options);

  return (
    <Tag
      className={cn(className)}
      suppressHydrationWarning
      {...props}
    >
      {formatted}
    </Tag>
  );
}

interface LocaleDateTimeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The date/time to format */
  date: Date | string | number;
  /** Locale string (e.g., "ja-JP", "en-US") */
  locale?: string;
  /** Intl.DateTimeFormatOptions for date formatting */
  dateOptions?: Intl.DateTimeFormatOptions;
  /** Intl.DateTimeFormatOptions for time formatting */
  timeOptions?: Intl.DateTimeFormatOptions;
  /** Separator between date and time (default: " ") */
  separator?: string;
  /** HTML tag to render (default: "span") */
  as?: "span" | "p" | "div" | "time";
}

/**
 * Locale-aware date+time display component with hydration warning suppression.
 *
 * @example
 * ```tsx
 * <LocaleDateTime
 *   date={event.startTime}
 *   locale="ja-JP"
 *   dateOptions={{ month: "short", day: "numeric" }}
 *   timeOptions={{ hour: "2-digit", minute: "2-digit" }}
 * />
 * ```
 */
export function LocaleDateTime({
  date,
  locale = "ja-JP",
  dateOptions = { month: "short", day: "numeric" },
  timeOptions = { hour: "2-digit", minute: "2-digit" },
  separator = " ",
  as: Tag = "span",
  className,
  ...props
}: LocaleDateTimeProps) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const formattedDate = dateObj.toLocaleDateString(locale, dateOptions);
  const formattedTime = dateObj.toLocaleTimeString(locale, timeOptions);

  return (
    <Tag
      className={cn(className)}
      suppressHydrationWarning
      {...props}
    >
      {formattedDate}
      {separator}
      {formattedTime}
    </Tag>
  );
}

interface LocaleTimeRangeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Start date/time */
  start: Date | string | number;
  /** End date/time */
  end: Date | string | number;
  /** Locale string (e.g., "ja-JP", "en-US") */
  locale?: string;
  /** Intl.DateTimeFormatOptions for time formatting */
  options?: Intl.DateTimeFormatOptions;
  /** Separator between start and end (default: " - ") */
  separator?: string;
  /** HTML tag to render (default: "span") */
  as?: "span" | "p" | "div" | "time";
}

/**
 * Locale-aware time range display component with hydration warning suppression.
 *
 * @example
 * ```tsx
 * <LocaleTimeRange
 *   start={event.startTime}
 *   end={event.endTime}
 *   locale="ja-JP"
 * />
 * // Output: "09:00 - 10:30"
 * ```
 */
export function LocaleTimeRange({
  start,
  end,
  locale = "ja-JP",
  options = { hour: "2-digit", minute: "2-digit" },
  separator = " - ",
  as: Tag = "span",
  className,
  ...props
}: LocaleTimeRangeProps) {
  const startObj = start instanceof Date ? start : new Date(start);
  const endObj = end instanceof Date ? end : new Date(end);
  const formattedStart = startObj.toLocaleTimeString(locale, options);
  const formattedEnd = endObj.toLocaleTimeString(locale, options);

  return (
    <Tag
      className={cn(className)}
      suppressHydrationWarning
      {...props}
    >
      {formattedStart}
      {separator}
      {formattedEnd}
    </Tag>
  );
}
