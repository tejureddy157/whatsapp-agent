"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

export interface ConversationListItem {
  id: string;
  status: "ACTIVE" | "CLOSED";
  mode: "AI" | "HUMAN";
  needsHumanAttention: boolean;
  updatedAt: string;
  customer: { id: string; name: string | null; waPhoneNumber: string; isNew: boolean };
  lastMessage: { content: string; createdAt: string; direction: "IN" | "OUT" } | null;
}

function initials(name: string | null, fallback: string): string {
  const source = name?.trim() || fallback;
  return source
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["conversations-list", search],
    queryFn: () =>
      apiRequest<{ conversations: ConversationListItem[] }>(
        `/api/crm/conversations${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
    refetchInterval: 15_000,
  });

  return (
    <div className="flex h-full w-full flex-col border-r border-border lg:w-80 xl:w-96">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or number…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data?.conversations.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          data?.conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted",
                selectedId === c.id && "bg-muted",
              )}
            >
              <Avatar>
                <AvatarFallback>{initials(c.customer.name, c.customer.waPhoneNumber)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {c.customer.name || c.customer.waPhoneNumber}
                  </span>
                  {c.lastMessage && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {c.lastMessage?.content ?? "No messages yet"}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge variant={c.mode === "AI" ? "ai" : "secondary"}>{c.mode}</Badge>
                  {c.needsHumanAttention && <Badge variant="warn">Needs attention</Badge>}
                  {c.customer.isNew && <Badge variant="outline">New</Badge>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
