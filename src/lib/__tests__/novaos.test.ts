import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  buildAvatarUrl,
  dedupeContacts,
  dedupeMessages,
  extractYouTubeVideoId,
  getCounterpartId,
  getCounterpartProfile,
  getPresenceLabel,
  getStoragePathFromUrl,
  isConversationMessage,
  looksLikeUrl,
  normalizeUrl,
  toSocialContact,
} from '@/lib/novaos';
import type { FriendshipRow, MessageRow } from '@/types/novaos';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const profileA = {
  id: 'a',
  username: 'alice',
  avatar_url: null,
  high_score: 0,
  bio: null,
  status_text: null,
  last_active_at: null,
  theme: null,
};

const profileB = {
  id: 'b',
  username: 'bob',
  avatar_url: null,
  high_score: 0,
  bio: null,
  status_text: null,
  last_active_at: null,
  theme: null,
};

const makeFriendship = (overrides: Partial<FriendshipRow> = {}): FriendshipRow => ({
  id: 'rel-1',
  user_id: 'a',
  friend_id: 'b',
  status: 'accepted',
  created_at: '2024-01-01T00:00:00Z',
  requester: profileA,
  recipient: profileB,
  ...overrides,
});

// ---------------------------------------------------------------------------
// buildAvatarUrl
// ---------------------------------------------------------------------------

describe('buildAvatarUrl', () => {
  it('returns a DiceBear URL with the seed encoded', () => {
    const url = buildAvatarUrl('alice');
    expect(url).toBe('https://api.dicebear.com/7.x/avataaars/svg?seed=alice');
  });

  it('percent-encodes seeds with special characters', () => {
    const url = buildAvatarUrl('hello world');
    expect(url).toContain('hello%20world');
  });
});

// ---------------------------------------------------------------------------
// extractYouTubeVideoId
// ---------------------------------------------------------------------------

describe('extractYouTubeVideoId', () => {
  it('extracts from youtube.com/watch?v=', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be short links', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns the bare 11-char ID as-is', () => {
    expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// looksLikeUrl / normalizeUrl
// ---------------------------------------------------------------------------

describe('looksLikeUrl', () => {
  it('recognises https:// URLs', () => {
    expect(looksLikeUrl('https://example.com')).toBe(true);
  });

  it('recognises http:// URLs', () => {
    expect(looksLikeUrl('http://example.com')).toBe(true);
  });

  it('recognises bare domains', () => {
    expect(looksLikeUrl('example.com')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(looksLikeUrl('just a search query')).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('leaves https:// URLs unchanged', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('prepends https:// to bare domains', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });
});

// ---------------------------------------------------------------------------
// getStoragePathFromUrl
// ---------------------------------------------------------------------------

describe('getStoragePathFromUrl', () => {
  it('strips the storage:// prefix', () => {
    expect(getStoragePathFromUrl('storage://user-files/abc/file.txt')).toBe('abc/file.txt');
  });

  it('extracts the path from a full Supabase storage URL', () => {
    const url = 'https://xxx.supabase.co/storage/v1/object/public/user-files/abc/file.txt';
    expect(getStoragePathFromUrl(url)).toBe('abc/file.txt');
  });

  it('returns null for non-storage URLs', () => {
    expect(getStoragePathFromUrl('https://example.com/image.png')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPresenceLabel
// ---------------------------------------------------------------------------

describe('getPresenceLabel', () => {
  it('returns "offline" when lastActiveAt is null', () => {
    expect(getPresenceLabel(null)).toBe('offline');
  });

  it('returns "offline" for invalid date strings', () => {
    expect(getPresenceLabel('not-a-date')).toBe('offline');
  });

  it('returns "online" when last active within 5 minutes', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    expect(getPresenceLabel(recent)).toBe('online');
  });

  it('returns minutes when 5–60 minutes ago', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(getPresenceLabel(tenMinutesAgo)).toMatch(/last active \d+m ago/);
  });

  it('returns hours when 1–24 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    expect(getPresenceLabel(twoHoursAgo)).toMatch(/last active \d+h ago/);
  });

  it('returns days when more than 24 hours ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    expect(getPresenceLabel(twoDaysAgo)).toMatch(/last active \d+d ago/);
  });
});

// ---------------------------------------------------------------------------
// getCounterpartProfile / getCounterpartId / toSocialContact
// ---------------------------------------------------------------------------

describe('getCounterpartProfile', () => {
  it('returns recipient when current user is the requester', () => {
    const friendship = makeFriendship();
    expect(getCounterpartProfile(friendship, 'a')).toEqual(profileB);
  });

  it('returns requester when current user is the recipient', () => {
    const friendship = makeFriendship();
    expect(getCounterpartProfile(friendship, 'b')).toEqual(profileA);
  });
});

describe('getCounterpartId', () => {
  it('returns friend_id when current user is user_id', () => {
    expect(getCounterpartId(makeFriendship(), 'a')).toBe('b');
  });

  it('returns user_id when current user is friend_id', () => {
    expect(getCounterpartId(makeFriendship(), 'b')).toBe('a');
  });
});

describe('toSocialContact', () => {
  it('maps a friendship to a SocialContact', () => {
    const contact = toSocialContact(makeFriendship(), 'a');
    expect(contact).toMatchObject({
      id: 'b',
      relationId: 'rel-1',
      status: 'accepted',
      initiatedByMe: true,
      profile: profileB,
    });
  });

  it('returns null when profile is missing', () => {
    const friendship = makeFriendship({ recipient: null, requester: null });
    expect(toSocialContact(friendship, 'a')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dedupeContacts
// ---------------------------------------------------------------------------

describe('dedupeContacts', () => {
  const base = {
    id: 'b',
    relationId: 'rel-1',
    initiatedByMe: true,
    created_at: '2024-01-01T00:00:00Z',
    profile: profileB,
  };

  it('keeps the accepted contact over a pending one with the same id', () => {
    const contacts = [
      { ...base, status: 'pending' as const },
      { ...base, status: 'accepted' as const, relationId: 'rel-2' },
    ];
    const result = dedupeContacts(contacts);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('accepted');
  });

  it('keeps the most recent when status weights are equal', () => {
    const contacts = [
      { ...base, created_at: '2024-01-01T00:00:00Z', relationId: 'rel-1' },
      { ...base, created_at: '2024-06-01T00:00:00Z', relationId: 'rel-2' },
    ];
    const result = dedupeContacts(contacts);
    expect(result).toHaveLength(1);
    expect(result[0].relationId).toBe('rel-2');
  });
});

// ---------------------------------------------------------------------------
// dedupeMessages
// ---------------------------------------------------------------------------

describe('dedupeMessages', () => {
  const makeMessage = (id: string, created_at: string): MessageRow => ({
    id,
    sender_id: 'a',
    receiver_id: 'b',
    content: 'hello',
    created_at,
  });

  it('removes duplicate message ids', () => {
    const messages = [
      makeMessage('1', '2024-01-01T00:00:01Z'),
      makeMessage('1', '2024-01-01T00:00:01Z'),
    ];
    expect(dedupeMessages(messages)).toHaveLength(1);
  });

  it('sorts messages by created_at ascending', () => {
    const messages = [
      makeMessage('2', '2024-01-01T00:00:02Z'),
      makeMessage('1', '2024-01-01T00:00:01Z'),
    ];
    const sorted = dedupeMessages(messages);
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// isConversationMessage
// ---------------------------------------------------------------------------

describe('isConversationMessage', () => {
  const msg: MessageRow = {
    id: '1',
    sender_id: 'a',
    receiver_id: 'b',
    content: 'hi',
    created_at: '2024-01-01T00:00:00Z',
  };

  it('returns true when message is between the two users (a→b)', () => {
    expect(isConversationMessage(msg, 'a', 'b')).toBe(true);
  });

  it('returns true when message is between the two users (b→a)', () => {
    expect(isConversationMessage({ ...msg, sender_id: 'b', receiver_id: 'a' }, 'a', 'b')).toBe(true);
  });

  it('returns false for messages involving other users', () => {
    expect(isConversationMessage(msg, 'a', 'c')).toBe(false);
  });
});
