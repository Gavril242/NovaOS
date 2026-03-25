import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageCircle, Send } from 'lucide-react';

import {
  FRIENDSHIP_SELECT,
  dedupeContacts,
  dedupeMessages,
  getPresenceLabel,
  isConversationMessage,
  resolveRenderableUrl,
  toSocialContact,
} from '@/lib/novaos';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { FriendshipRow, MessageRow, SocialContact, StorageFileRow } from '@/types/novaos';

export const Win11Messenger: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [friends, setFriends] = useState<SocialContact[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StorageFileRow[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const selectedFriend = useMemo(
    () => friends.find((friend) => friend.id === selectedFriendId) || null,
    [friends, selectedFriendId]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    loadFriends();
    loadPhotos();

    const channel = supabase
      .channel(`messenger-friends-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
        },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedFriend || !isSupabaseConfigured) {
      return;
    }

    loadMessages(selectedFriend.id);

    const channel = supabase
      .channel(`messages-${user.id}-${selectedFriend.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const incoming = payload.new as MessageRow;

          if (!isConversationMessage(incoming, user.id, selectedFriend.id)) {
            return;
          }

          const hydratedIncoming = {
            ...incoming,
            attachment_url:
              incoming.attachment_type === 'photo'
                ? await resolveRenderableUrl(incoming.attachment_url)
                : incoming.attachment_url,
          };

          setMessages((current) => dedupeMessages([...current, hydratedIncoming]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend?.id]);

  const loadFriends = async () => {
    if (!user) {
      return;
    }

    const { data, error: requestError } = await supabase
      .from('friends')
      .select(FRIENDSHIP_SELECT)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    const contacts = dedupeContacts(
      ((data || []) as FriendshipRow[])
        .map((row) => toSocialContact(row, user.id))
        .filter(Boolean) as SocialContact[]
    );

    setFriends(contacts);
    setSelectedFriendId((current) => current || contacts[0]?.id || null);
  };

  const loadPhotos = async () => {
    if (!user) {
      return;
    }

    const { data } = await supabase
      .from('storage_files')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_type', 'photo')
      .order('created_at', { ascending: false });

    const hydratedPhotos = await Promise.all(
      ((data || []) as StorageFileRow[]).map(async (photo) => ({
        ...photo,
        preview_url: await resolveRenderableUrl(photo.file_url),
      }))
    );

    setPhotos(hydratedPhotos);
  };

  const loadMessages = async (friendId: string) => {
    if (!user) {
      return;
    }

    const { data, error: requestError } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    const hydratedMessages = await Promise.all(
      ((data || []) as MessageRow[]).map(async (message) => ({
        ...message,
        attachment_url:
          message.attachment_type === 'photo'
            ? await resolveRenderableUrl(message.attachment_url)
            : message.attachment_url,
      }))
    );

    setMessages(hydratedMessages);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !selectedFriend || (!input.trim() && !selectedPhoto)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: requestError } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: input.trim(),
          attachment_url: selectedPhoto || null,
          attachment_type: selectedPhoto ? 'photo' : null,
        },
      ])
      .select('*')
      .single();

    if (requestError) {
      setError(requestError.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      const nextMessage = {
        ...(data as MessageRow),
        attachment_url:
          data.attachment_type === 'photo'
            ? await resolveRenderableUrl(data.attachment_url)
            : data.attachment_url,
      };

      setMessages((current) => dedupeMessages([...current, nextMessage]));
    }

    setInput('');
    setSelectedPhoto('');
    setIsLoading(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Messenger requires Supabase</p>
          <p className="mt-1 text-sm">Configure your backend to use chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      <div
        className={`${selectedFriend ? 'hidden sm:flex' : 'flex'} w-full flex-col border-r border-gray-200 bg-[#f8f9fa] sm:w-56`}
      >
        <div className="border-b border-gray-200 p-3 text-sm font-semibold text-gray-700">
          Chats
        </div>
        <div className="flex-1 overflow-auto">
          {friends.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">
              Add a friend first, then your chats will appear here.
            </div>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.relationId}
                onClick={() => setSelectedFriendId(friend.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50 ${
                  selectedFriend?.id === friend.id
                    ? 'border-l-2 border-blue-500 bg-blue-50'
                    : ''
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  {friend.profile.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-700">
                    {friend.profile.username}
                  </div>
                  <div className="truncate text-[11px] text-gray-400">
                    {friend.profile.status_text || getPresenceLabel(friend.profile.last_active_at)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${selectedFriend ? 'flex' : 'hidden sm:flex'} flex-1 flex-col`}>
        {selectedFriend ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-200 bg-white p-3">
              <button
                onClick={() => setSelectedFriendId(null)}
                className="rounded p-1 hover:bg-gray-100 sm:hidden"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                {selectedFriend.profile.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  {selectedFriend.profile.username}
                </div>
                <div className="text-[11px] text-gray-400">
                  {selectedFriend.profile.status_text || getPresenceLabel(selectedFriend.profile.last_active_at)}
                </div>
              </div>
            </div>

            {error && (
              <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-auto bg-[#f0f4f8] p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Start the conversation with {selectedFriend.profile.username}.
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => {
                    const mine = !!user && message.sender_id === user.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                            mine
                              ? 'rounded-br-none bg-blue-500 text-white'
                              : 'rounded-bl-none border border-gray-200 bg-white text-gray-800'
                          }`}
                        >
                          {message.content}
                          {message.attachment_url && (
                            <img
                              src={message.attachment_url}
                              alt="Attachment"
                              className="mt-2 max-h-56 rounded-lg object-cover"
                            />
                          )}
                          <div className="mt-1 text-[10px] opacity-60">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="border-t border-gray-200 bg-white p-3"
            >
              {photos.length > 0 && (
                <select
                  value={selectedPhoto}
                  onChange={(event) => setSelectedPhoto(event.target.value)}
                  className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600"
                >
                  <option value="">No photo attachment</option>
                  {photos.map((photo) => (
                    <option key={photo.id} value={photo.file_url}>
                      {photo.filename}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={`Message ${selectedFriend.profile.username}...`}
                  className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedPhoto) || isLoading}
                  className="rounded-full bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Select a friend to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
