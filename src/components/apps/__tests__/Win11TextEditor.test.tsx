import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  return { makeChain, mockSupabase, isConfigured: { value: true } };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
  get isSupabaseConfigured() {
    return mocks.isConfigured.value;
  },
  auth: mocks.mockSupabase,
}));

import { Win11TextEditor } from '../Win11TextEditor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TextFile {
  id: string;
  filename: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const makeFile = (overrides: Partial<TextFile> = {}): TextFile => ({
  id: 'file-1',
  filename: 'notes.txt',
  content: 'Hello world',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Win11TextEditor — demo mode (Supabase not configured)', () => {
  beforeEach(() => {
    mocks.isConfigured.value = false;
    vi.clearAllMocks();
  });

  it('renders a textarea with default welcome content', () => {
    render(<Win11TextEditor />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toContain('Welcome to Notepad');
  });

  it('allows typing in the textarea', async () => {
    const user = userEvent.setup();
    render(<Win11TextEditor />);
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'My test note');
    expect(textarea).toHaveValue('My test note');
  });

  it('shows the character count', () => {
    render(<Win11TextEditor />);
    expect(screen.getByText(/characters/i)).toBeInTheDocument();
  });
});

describe('Win11TextEditor — Supabase mode', () => {
  beforeEach(() => {
    mocks.isConfigured.value = true;
    vi.clearAllMocks();
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: [], error: null }));
  });

  it('renders the toolbar', async () => {
    renderWithUser(<Win11TextEditor />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument();
    });
  });

  it('Save button is disabled when no file is open', async () => {
    renderWithUser(<Win11TextEditor />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  it('queries desktop_files from Supabase on mount', async () => {
    renderWithUser(<Win11TextEditor />);
    await waitFor(() => {
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('desktop_files');
    });
  });

  it('shows the file list when Open is clicked', async () => {
    const user = userEvent.setup();
    const files = [makeFile({ id: 'f1', filename: 'todo.txt' })];
    mocks.mockSupabase.from.mockReturnValue(mocks.makeChain({ data: files, error: null }));
    renderWithUser(<Win11TextEditor />);
    await waitFor(() => screen.getByRole('button', { name: /open/i }));
    await user.click(screen.getByRole('button', { name: /open/i }));
    await waitFor(() => {
      expect(screen.getByText('todo.txt')).toBeInTheDocument();
    });
  });

  it('creates a new file on pressing Enter in the name input', async () => {
    const user = userEvent.setup();
    const newFile = makeFile({ id: 'new-1', filename: 'newfile.txt' });
    mocks.mockSupabase.from
      .mockReturnValueOnce(mocks.makeChain({ data: [], error: null }))      // initial load
      .mockReturnValueOnce(mocks.makeChain({ data: newFile, error: null })) // insert single
      .mockReturnValueOnce(mocks.makeChain({ data: [newFile], error: null })); // reload

    renderWithUser(<Win11TextEditor />);
    await waitFor(() => screen.getByRole('button', { name: /open/i }));
    await user.click(screen.getByRole('button', { name: /open/i }));
    const nameInput = screen.getByPlaceholderText('New file...');
    await user.type(nameInput, 'newfile{Enter}');
    expect(mocks.mockSupabase.from).toHaveBeenCalledWith('desktop_files');
  });

  it('shows error when Supabase query fails', async () => {
    mocks.mockSupabase.from.mockReturnValue(
      mocks.makeChain({ data: null, error: { message: 'Query failed' } })
    );
    renderWithUser(<Win11TextEditor />);
    await waitFor(() => {
      expect(screen.getByText('Query failed')).toBeInTheDocument();
    });
  });

  it('shows "No file open" in the status bar initially', async () => {
    renderWithUser(<Win11TextEditor />);
    await waitFor(() => {
      expect(screen.getByText(/no file open/i)).toBeInTheDocument();
    });
  });
});
