import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { renderWithUser, MOCK_USER } from '@/test/utils';

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
    resolveRenderableUrl: vi.fn().mockResolvedValue('https://cdn.example.com/photo.png'),
  };
});

import { Win11SocialFeed } from '../Win11SocialFeed';
import type { SocialPostRow } from '@/types/novaos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePost = (overrides: Partial<SocialPostRow> = {}): SocialPostRow => ({
  id: 'post-1',
  user_id: MOCK_USER.id,
  content: 'Hello world!',
  image_url: null,
  created_at: new Date().toISOString(),
  author: {
    id: MOCK_USER.id,
    username: MOCK_USER.username,
    avatar_url: MOCK_USER.avatar_url,
  },
  ...overrides,
});

// loadSocial fires 5 queries in parallel: friends, posts, likes, comments, photos
const mockEmptyLoad = (idx: { v: number }) =>
  mocks.mockSupabase.from.mockImplementation(() => {
    const chains = [
      mocks.makeChain({ data: [], error: null }), // friends
      mocks.makeChain({ data: [], error: null }), // posts
      mocks.makeChain({ data: [], error: null }), // likes
      mocks.makeChain({ data: [], error: null }), // comments
      mocks.makeChain({ data: [], error: null }), // photos
    ];
    return chains[idx.v++ % chains.length];
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11SocialFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSupabase.channel.mockReturnValue(mocks.makeChannel());
    const idx = { v: 0 };
    mockEmptyLoad(idx);
  });

  it('shows the post composer textarea', async () => {
    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/share something/i)).toBeInTheDocument();
    });
  });

  it('shows the Nova Feed header', async () => {
    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      expect(screen.getByText('Nova Feed')).toBeInTheDocument();
    });
  });

  it('renders posts from the current user', async () => {
    const post = makePost();
    let idx = 0;
    mocks.mockSupabase.from.mockImplementation(() => {
      const chains = [
        mocks.makeChain({ data: [], error: null }),
        mocks.makeChain({ data: [post], error: null }),
        mocks.makeChain({ data: [], error: null }),
        mocks.makeChain({ data: [], error: null }),
        mocks.makeChain({ data: [], error: null }),
      ];
      return chains[idx++ % chains.length];
    });

    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
    });
  });

  it('subscribes to realtime channels on mount', async () => {
    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      expect(mocks.mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('social-')
      );
    });
  });

  it('shows an error when a query fails', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: null, error: { message: 'Social load failed' } })
    );
    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      expect(screen.getByText('Social load failed')).toBeInTheDocument();
    });
  });

  it('does not query Supabase when there is no logged-in user', () => {
    render(<Win11SocialFeed />);
    expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
  });

  it('queries the social_posts table on load', async () => {
    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      const calls = mocks.mockSupabase.from.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContain('social_posts');
    });
  });

  it('queries friends and posts together on load', async () => {
    renderWithUser(<Win11SocialFeed />);
    await waitFor(() => {
      const calls = mocks.mockSupabase.from.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContain('friends');
      expect(calls).toContain('social_posts');
    });
  });
});
