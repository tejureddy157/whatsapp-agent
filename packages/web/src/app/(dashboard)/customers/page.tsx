"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Globe, Phone, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

interface CustomerListItem {
  id: string;
  name: string | null;
  waPhoneNumber: string;
  isNew: boolean;
  customerType: string;
  lastSeenAt: string;
}

interface CustomerDetail {
  customer: CustomerListItem & {
    preferredLanguage: string | null;
    firstMessageText: string | null;
    firstSeenAt: string;
    notes: string | null;
    conversations: {
      id: string;
      status: "ACTIVE" | "CLOSED";
      mode: "AI" | "HUMAN";
      startedAt: string;
    }[];
  };
}

function initials(name: string | null, fallback: string): string {
  const source = name?.trim() || fallback;
  return source.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["customers-list", search],
    queryFn: () =>
      apiRequest<{ customers: CustomerListItem[] }>(
        `/api/crm/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["customer-detail", selectedId],
    queryFn: () => apiRequest<CustomerDetail>(`/api/crm/customers/${selectedId}`),
    enabled: !!selectedId,
  });

  return (
    <div className="flex h-full">
      <div className="flex w-full flex-col border-r border-border lg:w-80 xl:w-96">
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
          {listLoading ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (
            listData?.customers.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted",
                  selectedId === c.id && "bg-muted",
                )}
              >
                <Avatar>
                  <AvatarFallback>{initials(c.name, c.waPhoneNumber)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name || c.waPhoneNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.waPhoneNumber}</p>
                </div>
                {c.isNew && <Badge variant="outline">New</Badge>}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="hidden flex-1 overflow-y-auto p-6 lg:block">
        {!selectedId ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-7" />
            </div>
            <p className="font-medium text-muted-foreground">Select a customer to view details</p>
          </div>
        ) : detailLoading || !detailData ? (
          <Skeleton className="h-48 w-full max-w-md" />
        ) : (
          <div className="max-w-md">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-base">
                  {initials(detailData.customer.name, detailData.customer.waPhoneNumber)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{detailData.customer.name || "Unknown name"}</p>
                <div className="mt-1 flex gap-1.5">
                  {detailData.customer.isNew && <Badge variant="outline">New</Badge>}
                  <Badge variant="secondary">{detailData.customer.customerType}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5 shrink-0" />
                <span className="text-foreground">{detailData.customer.waPhoneNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-3.5 shrink-0" />
                <span className="text-foreground">{detailData.customer.preferredLanguage ?? "Not detected yet"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" />
                <span className="text-foreground">
                  Customer since{" "}
                  {new Date(detailData.customer.firstSeenAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {detailData.customer.firstMessageText && (
              <div className="mt-6">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">First message</p>
                <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed">
                  {detailData.customer.firstMessageText}
                </p>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Conversation history ({detailData.customer.conversations.length})
              </p>
              <div className="flex flex-col gap-2">
                {detailData.customer.conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {new Date(conv.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <div className="flex gap-1.5">
                      <Badge variant={conv.mode === "AI" ? "ai" : "secondary"}>{conv.mode}</Badge>
                      <Badge variant="outline">{conv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
