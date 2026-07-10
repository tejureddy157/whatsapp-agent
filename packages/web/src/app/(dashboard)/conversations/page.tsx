"use client";

import { useState } from "react";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { ConversationList } from "@/components/conversations/conversation-list";
import { ConversationThread } from "@/components/conversations/conversation-thread";
import { CustomerPanel } from "@/components/conversations/customer-panel";
import { Button } from "@/components/ui/button";
import { useCrmSocket } from "@/hooks/use-crm-socket";
import { cn } from "@/lib/utils";

export default function ConversationsPage() {
  useCrmSocket();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <div className={cn("flex", selectedId ? "hidden lg:flex" : "flex w-full lg:w-auto")}>
        <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {selectedId ? (
        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border p-2 lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            </div>
            <ConversationThread conversationId={selectedId} />
          </div>
          <CustomerPanel conversationId={selectedId} />
        </div>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center lg:flex">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessagesSquare className="size-7" />
          </div>
          <div>
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm text-muted-foreground">Choose a customer on the left to view the thread.</p>
          </div>
        </div>
      )}
    </div>
  );
}
