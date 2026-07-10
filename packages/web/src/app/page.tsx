"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function RootPage() {
  const router = useRouter();
  const { accessToken, isInitializing } = useAuthStore((s) => ({
    accessToken: s.accessToken,
    isInitializing: s.isInitializing,
  }));

  useEffect(() => {
    if (isInitializing) return;
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [isInitializing, accessToken, router]);

  return null;
}
