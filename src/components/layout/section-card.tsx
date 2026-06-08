import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <Card className={`glass-card text-white ${className}`}>
      {title && (
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {title}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className={title ? "" : "p-6"}>{children}</CardContent>
    </Card>
  );
}