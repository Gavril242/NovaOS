import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { OSUser } from '@/stores/userStore';
import type { FriendshipRow, MessageRow, ProfileLite, SocialContact } from '@/types/novaos';

export const FRIENDSHIP_SELECT =
  'id, user_id, friend_id, status, created_at, requester:profiles!user_id(id, username, avatar_url, high_score, bio, status_text, last_active_at, theme), recipient:profiles!friend_id(id, username, avatar_url, high_score, bio, status_text, last_active_at, theme)';

const STATUS_WEIGHT: Record<string, number> = {
  accepted: 3,
  pending: 2,
  blocked: 1,
};

export const buildAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export const toOSUser = (authUser: User, profile?: Partial<ProfileLite> | null): OSUser => {
  const fallbackUsername =
    profile?.username ||
    authUser.user_metadata?.username ||
    authUser.email?.split('@')[0] ||
    'User';

  return {
    id: authUser.id,
    email: profile?.email || authUser.email || '',
    username: fallbackUsername,
    avatar_url: profile?.avatar_url || buildAvatarUrl(fallbackUsername),
    high_score: profile?.high_score || 0,
    bio: profile?.bio || '',
    status_text: profile?.status_text || '',
    last_active_at: profile?.last_active_at || new Date().toISOString(),
    theme: profile?.theme || 'light',
    created_at: authUser.created_at || new Date().toISOString(),
  };
};

export const getCounterpartProfile = (
  friendship: FriendshipRow,
  currentUserId: string
): ProfileLite | null => {
  if (friendship.user_id === currentUserId) {
    return friendship.recipient || null;
  }

  return friendship.requester || null;
};

export const getCounterpartId = (friendship: FriendshipRow, currentUserId: string) =>
  friendship.user_id === currentUserId ? friendship.friend_id : friendship.user_id;

export const toSocialContact = (
  friendship: FriendshipRow,
  currentUserId: string
): SocialContact | null => {
  const profile = getCounterpartProfile(friendship, currentUserId);
  const counterpartId = getCounterpartId(friendship, currentUserId);

  if (!profile) {
    return null;
  }

  return {
    id: counterpartId,
    relationId: friendship.id,
    status: friendship.status,
    initiatedByMe: friendship.user_id === currentUserId,
    created_at: friendship.created_at,
    profile,
  };
};

export const dedupeContacts = (contacts: SocialContact[]) => {
  const deduped = new Map<string, SocialContact>();

  for (const contact of contacts) {
    const existing = deduped.get(contact.id);
    if (!existing) {
      deduped.set(contact.id, contact);
      continue;
    }

    const existingWeight = STATUS_WEIGHT[existing.status] || 0;
    const nextWeight = STATUS_WEIGHT[contact.status] || 0;

    if (
      nextWeight > existingWeight ||
      (nextWeight === existingWeight && contact.created_at > existing.created_at)
    ) {
      deduped.set(contact.id, contact);
    }
  }

  return Array.from(deduped.values());
};

export const isConversationMessage = (
  message: MessageRow,
  currentUserId: string,
  otherUserId: string
) =>
  (message.sender_id === currentUserId && message.receiver_id === otherUserId) ||
  (message.sender_id === otherUserId && message.receiver_id === currentUserId);

export const dedupeMessages = (messages: MessageRow[]) => {
  const seen = new Map<string, MessageRow>();

  for (const message of messages) {
    seen.set(message.id, message);
  }

  return Array.from(seen.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
};

export const looksLikeUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(value);

export const normalizeUrl = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

export const extractYouTubeVideoId = (value: string) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return null;
};

export const getStoragePathFromUrl = (url: string) => {
  if (url.startsWith('storage://user-files/')) {
    return url.replace('storage://user-files/', '');
  }

  try {
    const parsed = new URL(url);
    const marker = '/user-files/';
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
};

export const getPresenceLabel = (lastActiveAt?: string | null) => {
  if (!lastActiveAt) {
    return 'offline';
  }

  const lastActiveMs = new Date(lastActiveAt).getTime();
  if (Number.isNaN(lastActiveMs)) {
    return 'offline';
  }

  const delta = Date.now() - lastActiveMs;
  if (delta < 5 * 60 * 1000) {
    return 'online';
  }

  const minutes = Math.floor(delta / 60000);
  if (minutes < 60) {
    return `last active ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `last active ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `last active ${days}d ago`;
};

export const resolveRenderableUrl = async (url?: string | null) => {
  if (!url) {
    return '';
  }

  const storagePath = getStoragePathFromUrl(url);
  if (!storagePath) {
    return url;
  }

  const { data: publicData } = supabase.storage.from('user-files').getPublicUrl(storagePath);
  if (publicData?.publicUrl) {
    return publicData.publicUrl;
  }

  const { data, error } = await supabase.storage.from('user-files').createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    return url;
  }

  return data.signedUrl;
};
