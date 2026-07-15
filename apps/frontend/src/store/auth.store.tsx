import { create } from "zustand";

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
}

interface AuthStore {
  user: User | null;
  authenticated: boolean;

  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
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