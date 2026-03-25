import React, { useEffect, useState } from 'react';
import { ArchiveRestore, Trash2 } from 'lucide-react';

import { getStoragePathFromUrl } from '@/lib/novaos';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { RecycleBinRow } from '@/types/novaos';

export const Win11RecycleBin: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [items, setItems] = useState<RecycleBinRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    loadItems();
  }, [user]);

  const loadItems = async () => {
    if (!user) {
      return;
    }

    const { data, error: requestError } = await supabase
      .from('recycle_bin')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setItems((data || []) as RecycleBinRow[]);
  };

  const restoreItem = async (item: RecycleBinRow) => {
    const payload = item.payload;

    if (item.source_table === 'desktop_files') {
      const { error: insertError } = await supabase.from('desktop_files').insert([
        {
          user_id: user?.id,
          filename: payload.filename,
          file_type: payload.file_type,
          content: payload.content || '',
        },
      ]);

      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    if (item.source_table === 'storage_files') {
      const { error: insertError } = await supabase.from('storage_files').insert([
        {
          user_id: user?.id,
          filename: payload.filename,
          file_type: payload.file_type,
          file_url: payload.file_url,
          size: payload.size,
        },
      ]);

      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    await supabase.from('recycle_bin').delete().eq('id', item.id);
    loadItems();
  };

  const deleteForever = async (item: RecycleBinRow) => {
    if (item.source_table === 'storage_files') {
      const payload = item.payload;
      const storagePath = typeof payload.file_url === 'string' ? getStoragePathFromUrl(payload.file_url) : null;
      if (storagePath) {
        await supabase.storage.from('user-files').remove([storagePath]);
      }
    }

    await supabase.from('recycle_bin').delete().eq('id', item.id);
    loadItems();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-gray-500">
        Recycle Bin requires Supabase
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 bg-[#f8f9fa] p-4">
        <h2 className="text-sm font-semibold text-gray-700">Recycle Bin</h2>
        <p className="text-[11px] text-gray-400">Deleted notes and storage items can be restored here.</p>
      </div>

      {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>}

      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <Trash2 size={40} className="mb-3 text-gray-300" />
            <p className="text-sm">Recycle Bin is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="rounded-xl bg-gray-200 p-3 text-gray-600">
                  <Trash2 size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{item.item_name}</div>
                  <div className="text-[11px] text-gray-400">
                    {item.source_table} · {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => restoreItem(item)} className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600">
                  Restore
                </button>
                <button onClick={() => deleteForever(item)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-100">
                  Delete Forever
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
