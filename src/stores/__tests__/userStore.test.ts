import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore, type OSUser } from '@/stores/userStore';

const mockUser: OSUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'tester',
  avatar_url: 'https://example.com/avatar.svg',
  high_score: 42,
  bio: 'Just testing',
  status_text: 'online',
  last_active_at: new Date().toISOString(),
  theme: 'light',
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  useUserStore.setState({ user: null, wallpaper: '' });
});

describe('useUserStore', () => {
  it('starts with no user and empty wallpaper', () => {
    const { user, wallpaper } = useUserStore.getState();
    expect(user).toBeNull();
    expect(wallpaper).toBe('');
  });

  it('setUser persists the user', () => {
    useUserStore.getState().setUser(mockUser);
    expect(useUserStore.getState().user).toEqual(mockUser);
  });

  it('clearUser removes the current user', () => {
    useUserStore.getState().setUser(mockUser);
    useUserStore.getState().clearUser();
    expect(useUserStore.getState().user).toBeNull();
  });

  it('setWallpaper persists the wallpaper URL', () => {
    useUserStore.getState().setWallpaper('https://example.com/wallpaper.jpg');
    expect(useUserStore.getState().wallpaper).toBe('https://example.com/wallpaper.jpg');
  });

  it('setUser replaces an existing user', () => {
    useUserStore.getState().setUser(mockUser);
    const updated: OSUser = { ...mockUser, username: 'new-name' };
    useUserStore.getState().setUser(updated);
    expect(useUserStore.getState().user?.username).toBe('new-name');
  });
});
