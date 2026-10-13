import { ChevronDown } from "lucide-react";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Visual for dropdown triggers. Kept free of Radix so the same button can be
 * server-rendered as a placeholder before the menu code loads (no layout shift).
 */
export const TriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { icon?: ReactNode; active?: boolean; badge?: number }
>(function TriggerButton({ icon, active, badge, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border pl-3.5 pr-3 text-[14px] font-medium whitespace-nowrap",
        "transition-[background-color,border-color,color] duration-200",
        active ? "border-fg-3 bg-elevated text-fg" : "border-line bg-raised text-fg-2 hover:border-line-strong hover:text-fg",
        "data-[state=open]:border-fg-3 data-[state=open]:bg-elevated data-[state=open]:text-fg",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {!!badge && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[11px] text-on-accent">
          {badge}
        </span>
      )}
      <ChevronDown aria-hidden className="size-4 text-fg-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
    </button>
  );
});
