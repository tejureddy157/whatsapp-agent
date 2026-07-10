"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bot, Loader2, MessageCircleMore, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./mode-toggle";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SenderType = "CUSTOMER" | "AI" | "HUMAN_AGENT" | "SYSTEM";

interface Message {
  id: string;
  direction: "IN" | "OUT";
  content: string;
  senderType: SenderType;
  status: string | null;
  mediaType: string | null;
  createdAt: string;
  sentByUser: { id: string; name: string } | null;
}

interface ConversationDetail {
  conversation: {
    id: string;
    mode: "AI" | "HUMAN";
    status: "ACTIVE" | "CLOSED";
    customerId: string;
    customer: { id: string; name: string | null; waPhoneNumber: string };
  };
  messages: Message[];
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isToday) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function senderMeta(type: SenderType, agentName: string | null) {
  switch (type) {
    case "AI":
      return { label: "AI", icon: Bot, bubble: "bg-accent-ai/10 text-foreground border border-accent-ai/20" };
    case "HUMAN_AGENT":
      return {
        label: agentName ?? "Agent",
        icon: UserRound,
        bubble: "bg-primary text-primary-foreground",
      };
    case "SYSTEM":
      return { label: "System", icon: Sparkles, bubble: "bg-muted text-muted-foreground" };
    default:
      return { label: "Customer", icon: MessageCircleMore, bubble: "bg-card border border-border" };
  }
}

export function ConversationThread({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conversation-detail", conversationId],
    queryFn: () => apiRequest<ConversationDetail>(`/api/crm/conversations/${conversationId}`),
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiRequest(`/api/crm/conversations/${conversationId}/reply`, { method: "POST", body: { body } }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", conversationId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { conversation, messages } = data;
  let lastDay = "";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {conversation.customer.name || conversation.customer.waPhoneNumber}
          </p>
          <p className="text-xs text-muted-foreground">{conversation.customer.waPhoneNumber}</p>
        </div>
        <ModeToggle conversationId={conversation.id} mode={conversation.mode} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.map((m) => {
          const showDay = dayLabel(m.createdAt) !== lastDay;
          lastDay = dayLabel(m.createdAt);
          const meta = senderMeta(m.senderType, m.sentByUser?.name ?? null);
          const isCustomer = m.senderType === "CUSTOMER";

          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("mb-3 flex", isCustomer ? "justify-start" : "justify-end")}
              >
                <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm", meta.bubble)}>
                  {!isCustomer && (
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-medium opacity-80">
                      <meta.icon className="size-3" />
                      {meta.label}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className="mt-1 text-right text-[10px] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) sendMutation.mutate(draft.trim());
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim()) sendMutation.mutate(draft.trim());
            }
          }}
          rows={1}
          placeholder="Type a message as yourself…"
          className="flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || sendMutation.isPending}>
          {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
