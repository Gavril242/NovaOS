import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithUser } from '@/test/utils';

// ---------------------------------------------------------------------------
// Inline mocks
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

vi.mock('@/lib/novaos', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/novaos')>();
  return {
    ...original,
    resolveRenderableUrl: vi.fn().mockResolvedValue('https://cdn.example.com/avatar.svg'),
  };
});

import { Win11Friends } from '../Win11Friends';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11Friends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [], error: null }));
    mocks.mockSupabase.channel.mockReturnValue(mocks.makeChannel());
  });

  it('renders the three tab buttons', async () => {
    renderWithUser(<Win11Friends />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /friends/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /requests/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add friend/i })).toBeInTheDocument();
    });
  });

  it('shows an empty-state on the friends tab by default', async () => {
    renderWithUser(<Win11Friends />);
    await waitFor(() => {
      expect(screen.getByText(/no friends yet/i)).toBeInTheDocument();
    });
  });

  it('subscribes to the friends realtime channel on mount', async () => {
    renderWithUser(<Win11Friends />);
    await waitFor(() => {
      expect(mocks.mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('friends-')
      );
    });
  });

  it('shows the search input when the Add Friend tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithUser(<Win11Friends />);
    await waitFor(() => screen.getByRole('button', { name: /add friend/i }));
    await user.click(screen.getByRole('button', { name: /add friend/i }));
    expect(screen.getByPlaceholderText(/search by username/i)).toBeInTheDocument();
  });

  it('queries the profiles table when searching', async () => {
    const user = userEvent.setup();
    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null }))  // initial load
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null })); // search

    renderWithUser(<Win11Friends />);
    await waitFor(() => screen.getByRole('button', { name: /add friend/i }));
    await user.click(screen.getByRole('button', { name: /add friend/i }));
    const searchInput = screen.getByPlaceholderText(/search by username/i);
    await user.type(searchInput, 'alice{Enter}');
    await waitFor(() => {
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('shows an error message when loadRelationships fails', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: null, error: { message: 'Load failed' } })
    );
    renderWithUser(<Win11Friends />);
    await waitFor(() => {
      expect(screen.getByText('Load failed')).toBeInTheDocument();
    });
  });

  it('shows the requests tab with empty-state', async () => {
    const user = userEvent.setup();
    renderWithUser(<Win11Friends />);
    await waitFor(() => screen.getByRole('button', { name: /requests/i }));
    await user.click(screen.getByRole('button', { name: /requests/i }));
    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
  });
});
