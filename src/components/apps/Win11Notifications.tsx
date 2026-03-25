import React, { useEffect, useState } from 'react';
import { Bell, MessageSquare, Users, X } from 'lucide-react';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { NotificationRow } from '@/types/novaos';

export const Win11Notifications: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) {
      return;
    }

    const { data, error: requestError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setNotifications((data || []) as NotificationRow[]);
  };

  const markRead = async (id: string) => {
    const { error: requestError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const remove = async (id: string) => {
    const { error: requestError } = await supabase.from('notifications').delete().eq('id', id);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const clearAll = async () => {
    if (!user) {
      return;
    }

    const { error: requestError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setNotifications([]);
  };

  const icon = (type: NotificationRow['type']) => {
    if (type === 'message') {
      return <MessageSquare size={16} className="text-blue-500" />;
    }

    if (type === 'friend_request') {
      return <Users size={16} className="text-green-500" />;
    }

    return <Bell size={16} className="text-yellow-500" />;
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <Bell size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Notifications require Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-[#f8f9fa] p-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Notifications</h2>
          <p className="text-[11px] text-gray-400">Realtime social activity for NovaOS</p>
        </div>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="text-xs text-blue-500 hover:underline">
            Clear all
          </button>
        )}
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <Bell size={40} className="mb-3 text-gray-200" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markRead(notification.id)}
              className={`flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-3 transition-colors ${
                notification.read ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <div className="mt-0.5 shrink-0">{icon(notification.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{notification.message}</p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  remove(notification.id);
                }}
                className="shrink-0 rounded p-1 hover:bg-gray-200"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
