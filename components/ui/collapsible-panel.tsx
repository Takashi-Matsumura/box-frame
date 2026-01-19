"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// CollapsiblePanel
// ============================================================================

interface CollapsiblePanelContextValue {
  isOpen: boolean;
}

const CollapsiblePanelContext =
  React.createContext<CollapsiblePanelContextValue>({
    isOpen: false,
  });

function useCollapsiblePanel() {
  const context = React.useContext(CollapsiblePanelContext);
  if (!context) {
    throw new Error(
      "useCollapsiblePanel must be used within a CollapsiblePanel"
    );
  }
  return context;
}

interface CollapsiblePanelProps
  extends React.ComponentProps<typeof CollapsiblePrimitive.Root> {
  /** デフォルトで展開するか */
  defaultOpen?: boolean;
  /** 制御モード用の開閉状態 */
  open?: boolean;
  /** 開閉状態が変わった時のコールバック */
  onOpenChange?: (open: boolean) => void;
}

function CollapsiblePanel({
  className,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  ...props
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (open === undefined) {
        setIsOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [open, onOpenChange]
  );

  const actualIsOpen = open !== undefined ? open : isOpen;

  return (
    <CollapsiblePanelContext.Provider value={{ isOpen: actualIsOpen }}>
      <CollapsiblePrimitive.Root
        data-slot="collapsible-panel"
        open={actualIsOpen}
        onOpenChange={handleOpenChange}
        className={cn(
          "bg-card text-card-foreground rounded-xl border shadow-sm transition-all duration-300",
          className
        )}
        {...props}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </CollapsiblePanelContext.Provider>
  );
}

// ============================================================================
// CollapsiblePanelHeader
// ============================================================================

interface CollapsiblePanelHeaderProps extends React.ComponentProps<"div"> {
  /** 折りたたみトリガーを含めるか（デフォルト: true） */
  withTrigger?: boolean;
}

function CollapsiblePanelHeader({
  className,
  children,
  withTrigger = true,
  ...props
}: CollapsiblePanelHeaderProps) {
  const { isOpen } = useCollapsiblePanel();

  return (
    <div
      data-slot="collapsible-panel-header"
      className={cn("px-6 py-4", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">{children}</div>
        {withTrigger && (
          <CollapsiblePrimitive.CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex-shrink-0 p-2 rounded-lg transition-all duration-200",
                "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label={isOpen ? "折りたたむ" : "展開する"}
            >
              <ChevronDown
                className={cn(
                  "h-5 w-5 transition-transform duration-300 ease-out",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsiblePrimitive.CollapsibleTrigger>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CollapsiblePanelTitle
// ============================================================================

function CollapsiblePanelTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="collapsible-panel-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

// ============================================================================
// CollapsiblePanelDescription
// ============================================================================

function CollapsiblePanelDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="collapsible-panel-description"
      className={cn("text-sm text-muted-foreground mt-1.5", className)}
      {...props}
    />
  );
}

// ============================================================================
// CollapsiblePanelSummary
// ============================================================================

interface CollapsiblePanelSummaryProps extends React.ComponentProps<"div"> {
  /** 展開時に非表示にするか（デフォルト: true） */
  hideWhenOpen?: boolean;
}

function CollapsiblePanelSummary({
  className,
  hideWhenOpen = true,
  ...props
}: CollapsiblePanelSummaryProps) {
  const { isOpen } = useCollapsiblePanel();

  if (hideWhenOpen && isOpen) {
    return null;
  }

  return (
    <div
      data-slot="collapsible-panel-summary"
      className={cn(
        "px-6 pb-4 transition-opacity duration-200",
        isOpen && "opacity-0",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// CollapsiblePanelContent
// ============================================================================

function CollapsiblePanelContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-panel-content"
      className={cn(
        "overflow-hidden",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:animate-collapsible-up",
        className
      )}
      {...props}
    >
      <div className="px-6 pb-6">{children}</div>
    </CollapsiblePrimitive.CollapsibleContent>
  );
}

// ============================================================================
// CollapsiblePanelDivider
// ============================================================================

function CollapsiblePanelDivider({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="collapsible-panel-divider"
      className={cn("border-t mx-6", className)}
      {...props}
    />
  );
}

// ============================================================================
// CollapsiblePanelTrigger (カスタムトリガー用)
// ============================================================================

function CollapsiblePanelTrigger({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-panel-trigger"
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium transition-colors",
        "text-primary hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// Type exports
// ============================================================================

type CollapsiblePanelTitleProps = React.ComponentProps<"h3">;
type CollapsiblePanelDescriptionProps = React.ComponentProps<"p">;
type CollapsiblePanelDividerProps = React.ComponentProps<"div">;
type CollapsiblePanelTriggerProps = React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleTrigger
>;
type CollapsiblePanelContentProps = React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleContent
>;

export {
  CollapsiblePanel,
  CollapsiblePanelHeader,
  CollapsiblePanelTitle,
  CollapsiblePanelDescription,
  CollapsiblePanelSummary,
  CollapsiblePanelContent,
  CollapsiblePanelDivider,
  CollapsiblePanelTrigger,
  useCollapsiblePanel,
};

export type {
  CollapsiblePanelProps,
  CollapsiblePanelHeaderProps,
  CollapsiblePanelTitleProps,
  CollapsiblePanelDescriptionProps,
  CollapsiblePanelSummaryProps,
  CollapsiblePanelContentProps,
  CollapsiblePanelDividerProps,
  CollapsiblePanelTriggerProps,
};
