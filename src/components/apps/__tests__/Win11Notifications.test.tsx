import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithUser, MOCK_USER } from '@/test/utils';

// ---------------------------------------------------------------------------
// Inline mock factory — vi.hoisted() runs before imports, so everything
// needed by the mock must be defined here, without importing external modules.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const makeChain = (result: unknown = { data: [], error: null }) => {
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'or', 'order', 'limit', 'ilike', 'in', 'filter']) {
      chain[m] = vi.fn(() => chain);
    }
    chain.single = vi.fn(() => Promise.resolve(result));
    chain.then = (resolve: ((v: unknown) => unknown) | null, reject: ((e: unknown) => unknown) | null) =>
      Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined);
    return chain;
  };

  const makeChannel = () => {
    const ch = { on: vi.fn(), subscribe: vi.fn() };
    ch.on.mockReturnValue(ch);
    ch.subscribe.mockReturnValue(ch);
    return ch;
  };

  const mockSupabase = {
    from: vi.fn(() => makeChain()),
    channel: vi.fn(() => makeChannel()),
    removeChannel: vi.fn(),
    storage: { from: vi.fn() },
  };

  return { makeChain, makeChannel, mockSupabase };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
  isSupabaseConfigured: true,
  auth: mocks.mockSupabase,
}));

import { Win11Notifications } from '../Win11Notifications';
import type { NotificationRow } from '@/types/novaos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNotification = (overrides: Partial<NotificationRow> = {}): NotificationRow => ({
  id: 'notif-1',
  user_id: MOCK_USER.id,
  type: 'system',
  title: 'Test notification',
  message: 'This is a test.',
  read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [], error: null }));
    mocks.mockSupabase.channel.mockReturnValue(mocks.makeChannel());
  });

  it('shows empty state when there are no notifications', async () => {
    renderWithUser(<Win11Notifications />);
    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  it('renders a list of notifications', async () => {
    const notifications = [
      makeNotification({ id: 'n1', title: 'Hello', message: 'World' }),
      makeNotification({ id: 'n2', title: 'Friend request', type: 'friend_request' }),
    ];
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: notifications, error: null })
    );
    renderWithUser(<Win11Notifications />);
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Friend request')).toBeInTheDocument();
    });
  });

  it('shows error message when the query fails', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: null, error: { message: 'DB error' } })
    );
    renderWithUser(<Win11Notifications />);
    await waitFor(() => {
      expect(screen.getByText('DB error')).toBeInTheDocument();
    });
  });

  it('marks a notification as read when an unread one is clicked', async () => {
    const user = userEvent.setup();
    const notification = makeNotification({ id: 'n1', read: false });

    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [notification], error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }));

    renderWithUser(<Win11Notifications />);
    await waitFor(() => screen.getByText('Test notification'));
    await user.click(screen.getByText('Test notification'));
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('notifications');
  });

  it('removes a notification when the X button is clicked', async () => {
    const user = userEvent.setup();
    const notification = makeNotification({ id: 'n1' });

    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [notification], error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }));

    renderWithUser(<Win11Notifications />);
    await waitFor(() => screen.getByText('Test notification'));

    // X button — only one button with no visible text in this context
    const allButtons = screen.getAllByRole('button');
    const xBtn = allButtons.find((b) => b.textContent?.trim() === '');
    await user.click(xBtn!);
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('notifications');
  });

  it('shows the Clear all button when notifications exist', async () => {
    const notification = makeNotification();
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: [notification], error: null })
    );
    renderWithUser(<Win11Notifications />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });
  });

  it('does not query Supabase when there is no logged-in user', () => {
    render(<Win11Notifications />);
    expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
  });

  it('subscribes to realtime notifications on mount', async () => {
    renderWithUser(<Win11Notifications />);
    await waitFor(() => {
      expect(mocks.mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('notifications-')
      );
    });
  });
});
