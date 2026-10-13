"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Accessible side/bottom sheet (shadcn-style, on Radix Dialog): focus trap,
 * Escape to close, scroll lock, labelled title. Right panel on desktop,
 * bottom sheet on mobile.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  hideTitle,
  children,
  footer,
  width = "md:w-[560px]",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            "sheet-content fixed z-[51] flex flex-col bg-surface shadow-[var(--shadow-overlay)] outline-none pointer-events-auto",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl border-t border-line",
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0",
            width,
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden" />
          <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 relative", hideTitle && "absolute inset-x-0 top-0 z-10 pt-5")}>
            <div className={cn("min-w-0", hideTitle && "sr-only")}>
              <Dialog.Title className="text-[19px] font-semibold tracking-[-0.01em]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[13px] text-fg-3">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-elevated/85 text-fg-2 backdrop-blur-md transition-all duration-200 hover:bg-hover hover:text-fg active:scale-95 relative z-[9999] pointer-events-auto"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="border-t border-line-subtle bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
