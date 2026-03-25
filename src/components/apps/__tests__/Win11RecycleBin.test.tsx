import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithUser, MOCK_USER } from '@/test/utils';

// ---------------------------------------------------------------------------
// Inline mocks (vi.hoisted runs before imports)
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

  const storageBucket = makeStorage();
  const mockSupabase = {
    from: vi.fn(() => makeChain()),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    storage: { from: vi.fn(() => storageBucket) },
    _storageBucket: storageBucket,
  };

  return { makeChain, makeStorage, mockSupabase };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
  isSupabaseConfigured: true,
  auth: mocks.mockSupabase,
}));

import { Win11RecycleBin } from '../Win11RecycleBin';
import type { RecycleBinRow } from '@/types/novaos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<RecycleBinRow> = {}): RecycleBinRow => ({
  id: 'item-1',
  user_id: MOCK_USER.id,
  source_table: 'desktop_files',
  item_name: 'notes.txt',
  payload: { filename: 'notes.txt', file_type: 'text', content: 'hello' },
  created_at: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11RecycleBin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [], error: null }));
    mocks.mockSupabase.storage.from.mockReturnValue(mocks.makeStorage());
  });

  it('shows the empty state when the bin is empty', async () => {
    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => {
      expect(screen.getByText('Recycle Bin is empty')).toBeInTheDocument();
    });
  });

  it('lists deleted items', async () => {
    const items = [
      makeItem({ id: 'i1', item_name: 'file1.txt' }),
      makeItem({ id: 'i2', item_name: 'photo.png', source_table: 'storage_files' }),
    ];
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: items, error: null }));
    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => {
      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('photo.png')).toBeInTheDocument();
    });
  });

  it('shows an error when loading fails', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: null, error: { message: 'Connection failed' } })
    );
    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  it('restores a desktop_files item', async () => {
    const user = userEvent.setup();
    const item = makeItem({ source_table: 'desktop_files' });

    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [item], error: null })) // loadItems
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))   // insert desktop_files
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))   // delete recycle_bin
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null }));     // reload

    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => screen.getByText('notes.txt'));
    await user.click(screen.getByRole('button', { name: /restore/i }));
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('desktop_files');
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('recycle_bin');
  });

  it('restores a storage_files item', async () => {
    const user = userEvent.setup();
    const item = makeItem({
      source_table: 'storage_files',
      item_name: 'photo.png',
      payload: {
        filename: 'photo.png',
        file_type: 'photo',
        file_url: 'storage://user-files/test/photo.png',
        size: 1024,
      },
    });

    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [item], error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null }));

    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => screen.getByText('photo.png'));
    await user.click(screen.getByRole('button', { name: /restore/i }));
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('storage_files');
  });

  it('permanently deletes an item and removes it from storage', async () => {
    const user = userEvent.setup();
    const storageMock = mocks.makeStorage();
    mocks.mockSupabase.storage.from.mockReturnValue(storageMock);

    const item = makeItem({
      source_table: 'storage_files',
      payload: { file_url: 'storage://user-files/test/photo.png' },
    });

    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [item], error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: null, error: null }))
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null }));

    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => screen.getByText('notes.txt'));
    await user.click(screen.getByRole('button', { name: /delete forever/i }));
    expect(storageMock.remove).toHaveBeenCalled();
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('recycle_bin');
  });

  it('shows the source table for each item', async () => {
    const item = makeItem({ source_table: 'desktop_files' });
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [item], error: null }));
    renderWithUser(<Win11RecycleBin />);
    await waitFor(() => {
      expect(screen.getByText(/desktop_files/)).toBeInTheDocument();
    });
  });
});
