import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { useUserStore, type OSUser } from '@/stores/userStore';

export const MOCK_USER: OSUser = {
  id: 'user-test-123',
  email: 'test@example.com',
  username: 'testuser',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser',
  high_score: 0,
  bio: '',
  status_text: '',
  last_active_at: new Date().toISOString(),
  theme: 'light',
  created_at: new Date().toISOString(),
};

/** Sets the Zustand user store state before rendering. Resets automatically via afterEach in setup.ts. */
export function setMockUser(overrides: Partial<OSUser> = {}) {
  useUserStore.setState({ user: { ...MOCK_USER, ...overrides } });
}

/** Custom render that optionally pre-seeds the user store. */
export function renderWithUser(
  ui: React.ReactElement,
  options?: RenderOptions & { user?: Partial<OSUser> | null }
) {
  if (options?.user !== null) {
    setMockUser(options?.user ?? {});
  }
  const { user: _user, ...rest } = options ?? {};
  return render(ui, rest);
}
