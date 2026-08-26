import { create } from "zustand";

import type { GithubUser } from "@/api/auth";

interface AuthStore {
  user: GithubUser | null;
  authenticated: boolean;

  setUser: (
    user: GithubUser | null
  ) => void;

  logout: () => void;
}

export const useAuthStore =
  create<AuthStore>((set) => ({
    user: null,

    authenticated: false,

    setUser: (user) =>
      set({
        user,
        authenticated: !!user,
      }),

    logout: () =>
      set({
        user: null,
        authenticated: false,
      }),
  }));