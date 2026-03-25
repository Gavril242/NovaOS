import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  const makeStorage = () => ({
    upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com' } }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example.com' }, error: null }),
  });

  const mockSupabase = {
    from: vi.fn(() => makeChain()),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    storage: { from: vi.fn(() => makeStorage()) },
  };

  return { makeChain, makeStorage, mockSupabase, isConfigured: { value: true } };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
  get isSupabaseConfigured() {
    return mocks.isConfigured.value;
  },
  auth: mocks.mockSupabase,
}));

vi.mock('@/lib/novaos', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/novaos')>();
  return {
    ...original,
    resolveRenderableUrl: vi.fn().mockResolvedValue('https://cdn.example.com/photo.png'),
  };
});

import { Win11FileManager } from '../Win11FileManager';
import type { StorageFileRow } from '@/types/novaos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeFile = (overrides: Partial<StorageFileRow> = {}): StorageFileRow => ({
  id: 'file-1',
  user_id: MOCK_USER.id,
  filename: 'document.txt',
  file_type: 'txt',
  file_url: 'storage://user-files/test/document.txt',
  size: 1024,
  created_at: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11FileManager — not configured', () => {
  beforeEach(() => {
    mocks.isConfigured.value = false;
    vi.clearAllMocks();
  });

  it('shows the "requires Supabase" message', () => {
    renderWithUser(<Win11FileManager />);
    expect(screen.getByText(/requires supabase/i)).toBeInTheDocument();
  });
});

describe('Win11FileManager — Supabase mode', () => {
  beforeEach(() => {
    mocks.isConfigured.value = true;
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [], error: null }));
    mocks.mockSupabase.storage.from.mockReturnValue(mocks.makeStorage());
  });

  it('shows the empty state when there are no files', async () => {
    renderWithUser(<Win11FileManager />);
    await waitFor(() => {
      expect(screen.getByText(/no files yet/i)).toBeInTheDocument();
    });
  });

  it('renders a list of files', async () => {
    const files = [
      makeFile({ id: 'f1', filename: 'report.txt', file_type: 'txt' }),
      makeFile({ id: 'f2', filename: 'photo.png', file_type: 'photo' }),
    ];
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: files, error: null }));
    renderWithUser(<Win11FileManager />);
    await waitFor(() => {
      expect(screen.getByText('report.txt')).toBeInTheDocument();
      expect(screen.getByText('photo.png')).toBeInTheDocument();
    });
  });

  it('shows an error when loading fails', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: null, error: { message: 'Network error' } })
    );
    renderWithUser(<Win11FileManager />);
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders the filter buttons', async () => {
    renderWithUser(<Win11FileManager />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /photos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /songs/i })).toBeInTheDocument();
    });
  });

  it('filters files by type when a filter button is clicked', async () => {
    const user = userEvent.setup();
    const files = [
      makeFile({ id: 'f1', filename: 'doc.txt', file_type: 'txt' }),
      makeFile({ id: 'f2', filename: 'photo.png', file_type: 'photo' }),
    ];
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: files, error: null }));
    renderWithUser(<Win11FileManager />);
    await waitFor(() => screen.getByText('doc.txt'));
    await user.click(screen.getByRole('button', { name: /photos/i }));
    expect(screen.queryByText('doc.txt')).not.toBeInTheDocument();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
  });

  it('deletes a file and moves it to the recycle bin', async () => {
    const user = userEvent.setup();
    const file = makeFile({ id: 'f1' });

    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [file], error: null })) // loadFiles
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))   // recycle_bin insert
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))   // storage_files delete
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null }));     // reload

    renderWithUser(<Win11FileManager />);
    await waitFor(() => screen.getByText('document.txt'));
    // Delete button is icon-only (Trash2); locate it via its distinctive class
    const deleteBtn = document.querySelector('button[class*="hover:bg-red-50"]') as HTMLElement;
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn);
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('recycle_bin');
  });
});
