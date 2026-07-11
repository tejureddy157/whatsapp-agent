"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Globe, Phone, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";

interface ConversationDetail {
  conversation: {
    needsHumanAttention: boolean;
    startedAt: string;
    customer: {
      id: string;
      name: string | null;
      waPhoneNumber: string;
      isNew: boolean;
      customerType: string;
      preferredLanguage: string | null;
      firstMessageText: string | null;
      firstSeenAt: string;
      notes: string | null;
    };
  };
}

function initials(name: string | null, fallback: string): string {
  const source = name?.trim() || fallback;
  return source.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CustomerPanel({ conversationId }: { conversationId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["conversation-detail", conversationId],
    queryFn: () => apiRequest<ConversationDetail>(`/api/crm/conversations/${conversationId}`),
  });

  if (isLoading || !data) {
    return (
      <div className="hidden w-72 shrink-0 border-l border-border p-5 xl:block">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const { customer } = data.conversation;

  return (
    <div className="hidden min-h-0 w-72 shrink-0 flex-col overflow-y-auto border-l border-border p-5 xl:flex">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">{initials(customer.name, customer.waPhoneNumber)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{customer.name || "Unknown name"}</p>
          <p className="text-xs text-muted-foreground">{customer.waPhoneNumber}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {customer.isNew && <Badge variant="outline">New customer</Badge>}
          {data.conversation.needsHumanAttention && <Badge variant="warn">Needs attention</Badge>}
          <Badge variant="secondary">{customer.customerType}</Badge>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="size-3.5 shrink-0" />
          <span className="text-foreground">{customer.waPhoneNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="size-3.5 shrink-0" />
          <span className="text-foreground">{customer.preferredLanguage ?? "Not detected yet"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span className="text-foreground">
            Customer since {new Date(customer.firstSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {customer.firstMessageText && (
        <div className="mt-6">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            First message
          </p>
          <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
            {customer.firstMessageText}
          </p>
        </div>
      )}

      {customer.notes && (
        <div className="mt-6">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Notes</p>
          <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}
