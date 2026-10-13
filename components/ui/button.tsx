import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none",
    "transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    size === "md" ? "h-11 px-5 text-[14px]" : "h-9 px-3.5 text-[13px]",
    variant === "primary" && "bg-accent text-on-accent hover:bg-accent-hover hover:shadow-[0_0_0_4px_rgb(205_255_90/0.14)]",
    variant === "secondary" && "border border-line-strong bg-elevated text-fg hover:border-fg-3 hover:bg-hover",
    variant === "ghost" && "text-fg-2 hover:bg-raised hover:text-fg",
    className,
  );
}

type Common = { variant?: Variant; size?: Size; icon?: ReactNode; iconRight?: ReactNode };

export function Button({ variant, size, icon, iconRight, className, children, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, iconRight, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link prefetch={false} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
