import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "ai" | "warn";
  index?: number;
}

const variantStyles: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "bg-primary/10 text-primary",
  ai: "bg-accent-ai/10 text-accent-ai",
  warn: "bg-accent-warn/15 text-accent-warn",
};

export function StatCard({ label, value, icon: Icon, variant = "default", index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 pt-5">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", variantStyles[variant])}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
