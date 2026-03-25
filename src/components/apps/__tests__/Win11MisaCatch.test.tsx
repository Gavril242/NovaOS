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

  const mockSupabase = {
    from: vi.fn(() => makeChain()),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    storage: { from: vi.fn() },
  };

  return { makeChain, mockSupabase };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
  isSupabaseConfigured: true,
  auth: mocks.mockSupabase,
}));

import { Win11MisaCatch } from '../Win11MisaCatch';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11MisaCatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: { high_score: 0 }, error: null })
    );
  });

  it('shows the game title on the start screen', () => {
    renderWithUser(<Win11MisaCatch />);
    expect(screen.getByText("Misa's Catch")).toBeInTheDocument();
  });

  it('shows the Start button', () => {
    renderWithUser(<Win11MisaCatch />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('loads the high score from the profiles table on mount', async () => {
    renderWithUser(<Win11MisaCatch />);
    await waitFor(() => {
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('displays the high score from Supabase', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: { high_score: 42 }, error: null })
    );
    renderWithUser(<Win11MisaCatch />);
    await waitFor(() => {
      // "🏆 High Score: {highScore}" is split across text nodes; match the container
      expect(screen.getByText(/High Score/)).toHaveTextContent('42');
    });
  });

  it('shows a canvas element after the Start button is clicked', async () => {
    const user = userEvent.setup();
    renderWithUser(<Win11MisaCatch />);
    await user.click(screen.getByRole('button', { name: /start/i }));
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('hides the Start button after the game begins', async () => {
    const user = userEvent.setup();
    renderWithUser(<Win11MisaCatch />);
    await user.click(screen.getByRole('button', { name: /start/i }));
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });

  it('shows a high score of 0 on the start screen', () => {
    renderWithUser(<Win11MisaCatch />);
    // "🏆 High Score: {highScore}" — text nodes are split, match the container
    expect(screen.getByText(/High Score/)).toHaveTextContent('0');
  });
});
