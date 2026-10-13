"use client";

import * as M from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Dropdown menus on Radix: arrow-key navigation, typeahead, focus return,
 * Escape to close. Styled for the dark system.
 */

export const Menu = M.Root;
export const MenuGroup = M.Group;
export const MenuRadioGroup = M.RadioGroup;
export const MenuSub = M.Sub;

export const MenuTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { icon?: ReactNode; active?: boolean; badge?: number }
>(function MenuTrigger({ icon, active, badge, className, children, ...rest }, ref) {
  return (
    <M.Trigger asChild>
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
    </M.Trigger>
  );
});

const panel =
  "menu-content z-50 min-w-[232px] rounded-2xl border border-line-strong bg-elevated p-1.5 shadow-[var(--shadow-overlay)] outline-none";

export function MenuContent({ className, align = "end", children, ...rest }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content align={align} sideOffset={8} collisionPadding={16} className={cn(panel, className)} {...rest}>
        {children}
      </M.Content>
    </M.Portal>
  );
}

const itemBase =
  "relative flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 text-[14px] text-fg-2 outline-none transition-colors " +
  "data-[highlighted]:bg-hover data-[highlighted]:text-fg data-[state=checked]:text-fg data-[disabled]:opacity-40 [&_svg]:shrink-0";

export function MenuLabel({ className, ...rest }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2.5 pt-2 pb-1.5 text-overline text-fg-3", className)} {...rest} />;
}

export function MenuSeparator() {
  return <M.Separator className="-mx-1.5 my-1.5 h-px bg-line" />;
}

export function MenuRadioItem({
  icon,
  hint,
  className,
  children,
  ...rest
}: ComponentProps<typeof M.RadioItem> & { icon?: ReactNode; hint?: ReactNode }) {
  return (
    <M.RadioItem className={cn(itemBase, "pr-9", className)} {...rest}>
      {icon && <span className="text-fg-3 [[data-highlighted]_&]:text-fg [[data-state=checked]_&]:text-accent">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="font-mono text-[12px] text-fg-3">{hint}</span>}
      <M.ItemIndicator className="absolute right-2.5 flex items-center text-accent">
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      </M.ItemIndicator>
    </M.RadioItem>
  );
}

export function MenuCheckboxItem({
  icon,
  className,
  children,
  ...rest
}: ComponentProps<typeof M.CheckboxItem> & { icon?: ReactNode }) {
  return (
    <M.CheckboxItem className={cn(itemBase, "pr-9", className)} onSelect={(e) => e.preventDefault()} {...rest}>
      {icon && <span className="text-fg-3 [[data-highlighted]_&]:text-fg [[data-state=checked]_&]:text-accent">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      <span
        aria-hidden
        className="absolute right-2.5 flex size-[18px] items-center justify-center rounded-[6px] border border-line-strong [[data-state=checked]_&]:border-accent [[data-state=checked]_&]:bg-accent"
      >
        <M.ItemIndicator>
          <Check className="size-3 text-on-accent" strokeWidth={3} />
        </M.ItemIndicator>
      </span>
    </M.CheckboxItem>
  );
}

export function MenuSubTrigger({
  icon,
  value,
  className,
  children,
  ...rest
}: ComponentProps<typeof M.SubTrigger> & { icon?: ReactNode; value?: ReactNode }) {
  return (
    <M.SubTrigger className={cn(itemBase, "data-[state=open]:bg-hover data-[state=open]:text-fg", className)} {...rest}>
      {icon && <span className="text-fg-3">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {value && <span className="text-[13px] text-fg-3">{value}</span>}
      <ChevronRight aria-hidden className="size-4 text-fg-3" />
    </M.SubTrigger>
  );
}

export function MenuSubContent({ className, ...rest }: ComponentProps<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent sideOffset={10} alignOffset={-6} collisionPadding={16} className={cn(panel, "min-w-[200px]", className)} {...rest} />
    </M.Portal>
  );
}
