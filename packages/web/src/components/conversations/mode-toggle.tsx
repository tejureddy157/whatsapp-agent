"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

interface ModeToggleProps {
  conversationId: string;
  mode: "AI" | "HUMAN";
}

export function ModeToggle({ conversationId, mode }: ModeToggleProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (next: "AI" | "HUMAN") =>
      apiRequest(`/api/crm/conversations/${conversationId}/mode`, {
        method: "PATCH",
        body: { mode: next },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations-list"] });
    },
  });

  return (
    <div className="flex items-center rounded-full border border-border bg-muted p-1 text-xs font-medium">
      <button
        disabled={mutation.isPending}
        onClick={() => mode !== "AI" && mutation.mutate("AI")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
          mode === "AI" ? "bg-accent-ai text-accent-ai-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Bot className="size-3.5" />
        AI Mode
      </button>
      <button
        disabled={mutation.isPending}
        onClick={() => mode !== "HUMAN" && mutation.mutate("HUMAN")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
          mode === "HUMAN" ? "bg-accent-warn text-accent-warn-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <UserRound className="size-3.5" />
        Human Mode
      </button>
    </div>
  );
}
