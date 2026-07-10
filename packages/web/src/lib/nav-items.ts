import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Cog,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserCog,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Fully built and wired to live data in this phase. */
  live: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, live: true },
  { label: "Conversations", href: "/conversations", icon: MessagesSquare, live: true },
  { label: "Customers", href: "/customers", icon: Users, live: true },
  { label: "Leads", href: "/leads", icon: Target, live: false },
  { label: "Orders", href: "/orders", icon: Package, live: false },
  { label: "Analytics", href: "/analytics", icon: BarChart3, live: false },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen, live: false },
  { label: "AI Settings", href: "/ai-settings", icon: Sparkles, live: false },
  { label: "WhatsApp Settings", href: "/whatsapp-settings", icon: Settings, live: false },
  { label: "Reports", href: "/reports", icon: FileText, live: false },
  { label: "Notifications", href: "/notifications", icon: Bell, live: false },
  { label: "Team Members", href: "/team-members", icon: UserCog, live: false },
  { label: "Roles & Permissions", href: "/roles-permissions", icon: ShieldCheck, live: false },
  { label: "Integrations", href: "/integrations", icon: Plug, live: false },
  { label: "System Settings", href: "/system-settings", icon: Cog, live: false },
];
