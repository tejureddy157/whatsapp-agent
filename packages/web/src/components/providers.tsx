"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme-provider";
import { refreshSession } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
      }),
  );
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    // On a hard page load, no access token is in memory yet — silently try
    // to mint one from the httpOnly refresh cookie so the session survives
    // a reload without forcing a re-login.
    refreshSession().finally(() => setInitializing(false));
  }, [setInitializing]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
