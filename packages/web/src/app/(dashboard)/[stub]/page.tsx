import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { navItems } from "@/lib/nav-items";

export default async function StubPage({ params }: { params: Promise<{ stub: string }> }) {
  const { stub } = await params;
  const item = navItems.find((n) => n.href === `/${stub}` && !n.live);
  if (!item) notFound();

  const Icon = item.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{item.label}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This module is planned for a later phase. Dashboard, Conversations, and Customers are fully
          built and live today.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5 rounded-full bg-accent-ai/10 px-3 py-1 text-xs font-medium text-accent-ai">
        <Sparkles className="size-3.5" />
        Coming soon
      </div>
    </div>
  );
}
