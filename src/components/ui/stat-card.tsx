import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
};

export function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card className="glass-card text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-300">{title}</p>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-emerald-300">
            {icon}
          </div>
        </div>

        <p className="mt-6 text-4xl font-bold tracking-tight">{value}</p>

        {description && (
          <p className="mt-2 text-sm leading-5 text-slate-400">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}