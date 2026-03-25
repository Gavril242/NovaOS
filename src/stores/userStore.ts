import { create } from 'zustand';

export interface OSUser {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  high_score: number;
  bio?: string;
  status_text?: string;
  last_active_at?: string;
  theme?: 'light' | 'dark';
  created_at: string;
}

interface UserStore {
  user: OSUser | null;
  wallpaper: string;
  setUser: (user: OSUser) => void;
  clearUser: () => void;
  setWallpaper: (url: string) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  wallpaper: '',
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setWallpaper: (wallpaper) => set({ wallpaper }),
}));
