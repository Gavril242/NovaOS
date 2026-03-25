import { vi } from 'vitest';

/**
 * Creates a chainable Supabase query builder mock.
 * The chain is awaitable (thenable) and resolves to `result`.
 * `.single()` also resolves to `result`.
 *
 * Usage:
 *   const chain = makeQueryChain({ data: [...], error: null });
 *   vi.mocked(mockSupabase.from).mockReturnValue(chain);
 */
export const makeQueryChain = (result: { data: unknown; error: unknown } = { data: [], error: null }) => {
  const chain: Record<string, unknown> = {};

  for (const method of [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'or', 'in', 'not', 'filter',
    'order', 'limit', 'ilike', 'gte', 'lte',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(result);
  // Make the chain itself awaitable so `await supabase.from('t').select()` works
  chain.then = (
    onFulfilled: ((v: unknown) => unknown) | null,
    onRejected: ((e: unknown) => unknown) | null
  ) => Promise.resolve(result).then(onFulfilled ?? undefined, onRejected ?? undefined);

  return chain as ReturnType<typeof makeQueryChain>;
};

export const makeChannelMock = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
});

export const makeStorageMock = () => ({
  upload: vi.fn().mockResolvedValue({ data: { path: 'test/file.txt' }, error: null }),
  remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
  getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/file.png' } }),
  createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://cdn.example.com/signed' }, error: null }),
});

/**
 * The shared mock supabase client. Import this in test files that use
 * `vi.mock('@/lib/supabase')` and wire it up via `vi.hoisted`.
 *
 * Individual tests can override per-call behaviour with:
 *   vi.mocked(mockSupabase.from).mockReturnValueOnce(makeQueryChain({ data: myData, error: null }))
 */
export const makeMockSupabase = () => {
  const channel = makeChannelMock();
  const storage = makeStorageMock();

  return {
    from: vi.fn().mockReturnValue(makeQueryChain()),
    channel: vi.fn().mockReturnValue(channel),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue(storage),
    },
    _channel: channel,
    _storage: storage,
  };
};
