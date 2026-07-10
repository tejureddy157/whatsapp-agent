"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";

interface NewMessageEvent {
  conversationId: string;
  messageId: string;
}
interface ModeChangedEvent {
  conversationId: string;
  mode: "AI" | "HUMAN";
}

/**
 * Keeps the conversation list and open thread in sync in real time. Events
 * originate from either process (server or worker) via the backend's Redis
 * event bus — see packages/api/src/realtime.
 */
export function useCrmSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function onNewMessage(payload: NewMessageEvent) {
      queryClient.invalidateQueries({ queryKey: ["conversations-list"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", payload.conversationId] });
    }
    function onNewConversation() {
      queryClient.invalidateQueries({ queryKey: ["conversations-list"] });
    }
    function onModeChanged(payload: ModeChangedEvent) {
      queryClient.invalidateQueries({ queryKey: ["conversations-list"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", payload.conversationId] });
    }

    socket.on("conversation:new_message", onNewMessage);
    socket.on("conversation:new", onNewConversation);
    socket.on("conversation:mode_changed", onModeChanged);

    return () => {
      socket.off("conversation:new_message", onNewMessage);
      socket.off("conversation:new", onNewConversation);
      socket.off("conversation:mode_changed", onModeChanged);
    };
  }, [accessToken, queryClient]);
}
