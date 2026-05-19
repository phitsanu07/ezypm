import { create } from "zustand";
import { supabase } from "@/frontend/lib/supabaseClient";
import { apiClient } from "@/frontend/lib/apiClient";
import { ApiClientError } from "@/frontend/lib/http-errors";
import type { Profile, MeResponse } from "@/types";

type AuthStatus =
  | "idle"
  | "bootstrapping"
  | "authed"
  | "signing-in"
  | "error"
  | "guest";

interface AuthState {
  status: AuthStatus;
  profile: Profile | null;
  errorMessage: string | null;
  bootstrap(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "idle",
  profile: null,
  errorMessage: null,

  async bootstrap() {
    set({ status: "bootstrapping", errorMessage: null });

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      set({ status: "guest", profile: null });
      return;
    }

    try {
      const me = await apiClient.get<MeResponse>("/api/auth/me");

      const { useBoardsStore } = await import("@/frontend/store/useBoardsStore");
      useBoardsStore.getState().setBoards(me.boards);

      set({ status: "authed", profile: me.profile, errorMessage: null });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (
          err.code === "USER_SUSPENDED" ||
          err.code === "UNAUTHENTICATED" ||
          err.status === 401
        ) {
          await supabase.auth.signOut();
          set({
            status: "guest",
            profile: null,
            errorMessage:
              err.code === "USER_SUSPENDED"
                ? "บัญชีของคุณถูกระงับ"
                : null,
          });
          return;
        }
      }
      set({ status: "error", errorMessage: "Failed to load profile" });
    }
  },

  async login(email, password) {
    set({ status: "signing-in", errorMessage: null });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({
        status: "error",
        errorMessage: "อีเมลหรือรหัสผ่านไม่ถูกต้อง / Invalid email or password",
      });
      return;
    }

    await get().bootstrap();
  },

  async logout() {
    await supabase.auth.signOut();

    const { useBoardsStore } = await import("@/frontend/store/useBoardsStore");
    const { usePortfolioStore } = await import(
      "@/frontend/store/usePortfolioStore"
    );
    useBoardsStore.getState().reset();
    usePortfolioStore.getState().reset();

    set({ status: "guest", profile: null, errorMessage: null });
  },
}));
