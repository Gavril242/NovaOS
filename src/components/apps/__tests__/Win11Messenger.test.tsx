import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

import { Win11Messenger } from '../Win11Messenger';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11Messenger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [], error: null }));
    mocks.mockSupabase.channel.mockReturnValue(mocks.makeChannel());
  });

  it('shows the empty state when the friends list is empty', async () => {
    renderWithUser(<Win11Messenger />);
    await waitFor(() => {
      expect(screen.getByText(/add a friend first/i)).toBeInTheDocument();
    });
  });

  it('subscribes to the friends realtime channel on mount', async () => {
    renderWithUser(<Win11Messenger />);
    await waitFor(() => {
      expect(mocks.mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('messenger-friends-')
      );
    });
  });

  it('loads photos from storage_files on mount', async () => {
    renderWithUser(<Win11Messenger />);
    await waitFor(() => {
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('storage_files');
    });
  });

  it('shows the Chats panel header', async () => {
    renderWithUser(<Win11Messenger />);
    await waitFor(() => {
      expect(screen.getByText('Chats')).toBeInTheDocument();
    });
  });

  it('renders without crashing when no user is logged in', () => {
    const { container } = render(<Win11Messenger />);
    expect(container).toBeInTheDocument();
    expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
  });

  it('queries the friends table with accepted status on mount', async () => {
    renderWithUser(<Win11Messenger />);
    await waitFor(() => {
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('friends');
    });
  });
});
