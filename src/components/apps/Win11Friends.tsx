import React, { useEffect, useMemo, useState } from 'react';
import { Check, MessageCircle, Plus, Search, UserPlus, Users, X } from 'lucide-react';

import { FRIENDSHIP_SELECT, buildAvatarUrl, dedupeContacts, getPresenceLabel, resolveRenderableUrl, toSocialContact } from '@/lib/novaos';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { FriendshipRow, ProfileLite, SocialContact } from '@/types/novaos';

export const Win11Friends: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [friends, setFriends] = useState<SocialContact[]>([]);
  const [requests, setRequests] = useState<SocialContact[]>([]);
  const [connections, setConnections] = useState<SocialContact[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<SocialContact | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    loadRelationships();

    const channel = supabase
      .channel(`friends-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
        },
        () => {
          loadRelationships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const connectionIds = useMemo(
    () => new Set(connections.filter((contact) => contact.status !== 'blocked').map((contact) => contact.id)),
    [connections]
  );

  const loadRelationships = async () => {
    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('friends')
      .select(FRIENDSHIP_SELECT)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      setFeedback(error.message);
      return;
    }

    const rows = ((data || []) as FriendshipRow[]).map((row) => toSocialContact(row, user.id)).filter(Boolean) as SocialContact[];
    const hydratedRows = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        profile: {
          ...row.profile,
          avatar_url: await resolveRenderableUrl(row.profile.avatar_url),
        },
      }))
    );
    setConnections(dedupeContacts(hydratedRows));
    setFriends(dedupeContacts(hydratedRows.filter((row) => row.status === 'accepted')));
    setRequests(
      dedupeContacts(
        hydratedRows.filter((row) => row.status === 'pending' && !row.initiatedByMe)
      )
    );
  };

  const handleSearch = async () => {
    if (!searchInput.trim() || !user) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, high_score, bio, status_text, last_active_at')
      .ilike('username', `%${searchInput.trim()}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) {
      setFeedback(error.message);
      setIsLoading(false);
      return;
    }

    const hydratedResults = await Promise.all(
      ((data || []) as ProfileLite[])
        .filter((profile) => !connectionIds.has(profile.id))
        .map(async (profile) => ({
          ...profile,
          avatar_url: await resolveRenderableUrl(profile.avatar_url),
        }))
    );

    setSearchResults(hydratedResults);
    setIsLoading(false);
  };

  const sendRequest = async (friendId: string) => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const { data: existingRows, error: existingError } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, status, created_at')
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
      )
      .limit(1);

    if (existingError) {
      setFeedback(existingError.message);
      setIsLoading(false);
      return;
    }

    const existing = (existingRows?.[0] || null) as FriendshipRow | null;

    if (existing?.status === 'accepted') {
      setFeedback('You are already connected.');
      setIsLoading(false);
      return;
    }

    if (existing?.status === 'pending') {
      if (existing.friend_id === user.id) {
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', existing.id);

        if (error) {
          setFeedback(error.message);
          setIsLoading(false);
          return;
        }

        setFeedback('Friend request accepted.');
      } else {
        setFeedback('Friend request already pending.');
      }
    } else {
      const { error } = await supabase.from('friends').insert([
        {
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        },
      ]);

      if (error) {
        setFeedback(error.message);
        setIsLoading(false);
        return;
      }

      setFeedback('Friend request sent.');
    }

    await loadRelationships();
    setSearchResults((results) => results.filter((result) => result.id !== friendId));
    setIsLoading(false);
  };

  const acceptRequest = async (relationId: string) => {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', relationId);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setFeedback('Friend request accepted.');
    loadRelationships();
  };

  const rejectRequest = async (relationId: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', relationId);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setFeedback('Friend request removed.');
    loadRelationships();
  };

  const removeFriend = async (relationId: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', relationId);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setFeedback('Friend removed.');
    loadRelationships();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Friends requires Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex border-b border-gray-200 bg-[#f8f9fa]">
        {(['friends', 'requests', 'search'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold capitalize transition-colors ${
              tab === item
                ? 'border-b-2 border-blue-500 bg-white text-blue-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {item === 'search' ? 'Add Friend' : item}
            {item === 'requests' && requests.length > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          {feedback}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No friends yet. Add some!</p>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.relationId}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-amber-500 text-sm font-bold text-white shrink-0">
                    {friend.profile.avatar_url ? (
                      <img
                        src={friend.profile.avatar_url}
                        alt={friend.profile.username}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = buildAvatarUrl(friend.profile.username || 'User');
                        }}
                      />
                    ) : (
                      friend.profile.username?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{friend.profile.username}</p>
                    <p className="text-[11px] text-gray-400">
                      {friend.profile.bio || friend.profile.status_text || 'Connected in NovaOS'}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                      {getPresenceLabel(friend.profile.last_active_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProfile(friend)}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => removeFriend(friend.relationId)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No pending requests</p>
            ) : (
              requests.map((request) => (
                <div key={request.relationId} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-green-500 text-sm font-bold text-white shrink-0">
                    {request.profile.avatar_url ? (
                      <img
                        src={request.profile.avatar_url}
                        alt={request.profile.username}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = buildAvatarUrl(request.profile.username || 'User');
                        }}
                      />
                    ) : (
                      request.profile.username?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{request.profile.username}</p>
                    <p className="text-[11px] text-gray-400">
                      {request.profile.bio || request.profile.status_text || 'Incoming friend request'}
                    </p>
                  </div>
                  <button
                    onClick={() => acceptRequest(request.relationId)}
                    className="rounded p-1.5 text-green-500 hover:bg-green-50"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => rejectRequest(request.relationId)}
                    className="rounded p-1.5 text-red-400 hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  placeholder="Search by username..."
                  className="w-full rounded-lg bg-gray-100 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
              >
                Search
              </button>
            </div>

            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <UserPlus size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    Search for NovaOS users to send a friend request.
                  </p>
                </div>
              ) : (
                searchResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-purple-500 text-sm font-bold text-white shrink-0">
                      {result.avatar_url ? (
                        <img
                          src={result.avatar_url}
                          alt={result.username}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = buildAvatarUrl(result.username || 'User');
                          }}
                        />
                      ) : (
                        result.username?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{result.username}</p>
                    <p className="text-[11px] text-gray-400">
                        {result.bio || result.status_text || (result.high_score ? `High score: ${result.high_score}` : 'Ready to connect')}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                      {getPresenceLabel(result.last_active_at)}
                    </p>
                  </div>
                    <button
                      onClick={() => sendRequest(result.id)}
                      disabled={isLoading}
                      className="rounded bg-blue-500 p-1.5 text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {selectedProfile && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => selectedProfile.profile.avatar_url && setProfileImagePreview(selectedProfile.profile.avatar_url)} className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-blue-500 text-lg font-bold text-white">
                  {selectedProfile.profile.avatar_url ? (
                    <img
                      src={selectedProfile.profile.avatar_url}
                      alt={selectedProfile.profile.username}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = buildAvatarUrl(selectedProfile.profile.username || 'User');
                      }}
                    />
                  ) : (
                    selectedProfile.profile.username?.charAt(0).toUpperCase() || '?'
                  )}
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedProfile.profile.username}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedProfile.profile.status_text || getPresenceLabel(selectedProfile.profile.last_active_at)}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>{selectedProfile.profile.bio || 'No bio yet.'}</p>
              <p>High score: {selectedProfile.profile.high_score || 0}</p>
              <p>{selectedProfile.profile.last_active_at ? `Last active: ${new Date(selectedProfile.profile.last_active_at).toLocaleString()}` : 'Presence unknown'}</p>
              <p className="text-xs uppercase tracking-wide text-gray-400">{getPresenceLabel(selectedProfile.profile.last_active_at)}</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('nova:open-app', { detail: { appId: 'messenger' } }));
                  setSelectedProfile(null);
                }}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageCircle size={14} />
                  Message
                </span>
              </button>
              <button
                onClick={() => {
                  removeFriend(selectedProfile.relationId);
                  setSelectedProfile(null);
                }}
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-100"
              >
                Remove Friend
              </button>
              <button onClick={() => setSelectedProfile(null)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {profileImagePreview && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-6" onClick={() => setProfileImagePreview(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={profileImagePreview} alt="Profile preview" className="max-h-[60vh] w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
