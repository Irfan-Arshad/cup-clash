import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type AppBadgeVariant =
  | "muted"
  | "emerald"
  | "gold"
  | "blue"
  | "red"
  | "slate";

type AppBadgeProps = {
  children: ReactNode;
  variant?: AppBadgeVariant;
  className?: string;
};

const variantClasses: Record<AppBadgeVariant, string> = {
  muted:
    "border-white/15 bg-white/10 text-slate-100 hover:bg-white/10",
  slate:
    "border-slate-300/20 bg-slate-300/10 text-slate-100 hover:bg-slate-300/10",
  emerald:
    "border-emerald-400/25 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/15",
  gold:
    "border-yellow-300/25 bg-yellow-300/15 text-yellow-100 hover:bg-yellow-300/15",
  blue:
    "border-blue-400/25 bg-blue-400/15 text-blue-100 hover:bg-blue-400/15",
  red:
    "border-red-400/25 bg-red-400/15 text-red-100 hover:bg-red-400/15",
};

export function AppBadge({
  children,
  variant = "muted",
  className = "",
}: AppBadgeProps) {
  return (
    <Badge
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Badge>
  );
}