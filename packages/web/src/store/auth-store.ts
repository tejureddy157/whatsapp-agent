import { create } from "zustand";

export interface CrmUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "SALES_EXECUTIVE" | "SUPPORT_EXECUTIVE" | "VIEWER";
}

interface AuthState {
  accessToken: string | null;
  user: CrmUser | null;
  /** True until the initial silent-refresh attempt (on app load) resolves. */
  isInitializing: boolean;
  setSession: (accessToken: string, user: CrmUser) => void;
  clearSession: () => void;
  setInitializing: (value: boolean) => void;
}

// Access token lives in memory only — never localStorage — so it can't be
// read by an injected script; the refresh token (httpOnly cookie) is what
// survives a page reload.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setInitializing: (value) => set({ isInitializing: value }),
}));
