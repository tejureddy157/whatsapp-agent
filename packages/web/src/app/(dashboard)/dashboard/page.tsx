"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  MessageSquareText,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { MessageVolumeChart } from "@/components/dashboard/message-volume-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";

interface DashboardStats {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  activeConversations: number;
  closedConversations: number;
  conversationsNeedingAttention: number;
  aiResponses: number;
  humanResponses: number;
  todaysChats: number;
  dailyMessageVolume: { date: string; count: number }[];
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiRequest<DashboardStats>("/api/crm/dashboard/stats"),
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">A live snapshot of your WhatsApp AI agent.</p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <StatCard index={0} label="Total Customers" value={data.totalCustomers} icon={Users} />
            <StatCard index={1} label="New Customers" value={data.newCustomers} icon={UserPlus} />
            <StatCard index={2} label="Returning Customers" value={data.returningCustomers} icon={UserCheck} />
            <StatCard index={3} label="Today's Chats" value={data.todaysChats} icon={MessageSquareText} />
            <StatCard index={4} label="Active Conversations" value={data.activeConversations} icon={UsersRound} />
            <StatCard index={5} label="Closed Conversations" value={data.closedConversations} icon={CheckCircle2} />
            <StatCard
              index={6}
              label="Needs Attention"
              value={data.conversationsNeedingAttention}
              icon={AlertTriangle}
              variant="warn"
            />
            <StatCard index={7} label="AI Responses" value={data.aiResponses} icon={Bot} variant="ai" />
          </div>

          <div className="mt-6">
            <MessageVolumeChart data={data.dailyMessageVolume} />
          </div>
        </>
      )}
    </div>
  );
}
