import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, Music4, Plus, Trash2, Upload } from 'lucide-react';

import { getStoragePathFromUrl, resolveRenderableUrl } from '@/lib/novaos';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import type { StorageFileRow } from '@/types/novaos';

export const Win11FileManager: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [files, setFiles] = useState<StorageFileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'txt' | 'photo' | 'song'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    loadFiles();
  }, [user]);

  const loadFiles = async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: requestError } = await supabase
      .from('storage_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (requestError) {
      setError(requestError.message);
      setIsLoading(false);
      return;
    }

    const hydratedFiles = await Promise.all(
      ((data || []) as StorageFileRow[]).map(async (file) => ({
        ...file,
        preview_url: file.file_type === 'photo' ? await resolveRenderableUrl(file.file_url) : file.preview_url,
      }))
    );

    setFiles(hydratedFiles);
    setIsLoading(false);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) {
      return;
    }

    const file = event.target.files[0];
    const isPhoto = file.type.startsWith('image/');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
    const isSong = file.type.startsWith('audio/');

    if (!isPhoto && !isTxt && !isSong) {
      setError('Only photos, text files, and audio files are supported.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from('user-files').upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setIsLoading(false);
      return;
    }

    const fileType: StorageFileRow['file_type'] = isPhoto ? 'photo' : isSong ? 'song' : 'txt';

    const { error: insertError } = await supabase.from('storage_files').insert([
      {
        user_id: user.id,
        filename: file.name,
        file_type: fileType,
        file_url: `storage://user-files/${path}`,
        size: file.size,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    event.target.value = '';
    loadFiles();
  };

  const moveToRecycleBin = async (file: StorageFileRow) => {
    if (!user) {
      return;
    }

    const { error: recycleError } = await supabase.from('recycle_bin').insert([
      {
        user_id: user.id,
        source_table: 'storage_files',
        item_name: file.filename,
        payload: {
          filename: file.filename,
          file_type: file.file_type,
          file_url: file.file_url,
          size: file.size,
        },
      },
    ]);

    if (recycleError) {
      setError(recycleError.message);
      return;
    }

    const { error: requestError } = await supabase.from('storage_files').delete().eq('id', file.id);
    if (requestError) {
      setError(requestError.message);
      return;
    }

    setFiles((current) => current.filter((item) => item.id !== file.id));
  };

  const openFile = async (file: StorageFileRow) => {
    const storagePath = getStoragePathFromUrl(file.file_url);

    if (!storagePath) {
      window.open(file.file_url, '_blank', 'noopener,noreferrer');
      return;
    }

    const { data } = await supabase.storage.from('user-files').createSignedUrl(storagePath, 60 * 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const filtered = filter === 'all' ? files : files.filter((file) => file.file_type === filter);

  if (!isSupabaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">File Manager requires Supabase</p>
          <p className="mt-1 text-sm">Configure your backend to manage files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-[#f8f9fa] p-3">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600">
          <Upload size={14} />
          Upload
          <input
            type="file"
            onChange={handleUpload}
            disabled={isLoading}
            accept=".txt,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg,.m4a"
            className="hidden"
          />
        </label>

        <div className="ml-auto flex gap-1">
          {(['all', 'txt', 'photo', 'song'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === item ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item === 'all' ? 'All' : item === 'txt' ? 'Text' : item === 'photo' ? 'Photos' : 'Songs'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
          <Plus size={40} className="mb-2 text-gray-300" />
          <p className="text-sm">No files yet. Upload one!</p>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-3 gap-3 overflow-auto p-4 sm:grid-cols-4">
          {filtered.map((file) => (
            <div key={file.id} className="group relative rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100">
              <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded bg-gray-200">
                {file.file_type === 'photo' ? (
                  <img src={file.preview_url || file.file_url} alt={file.filename} className="h-full w-full object-cover" />
                ) : file.file_type === 'song' ? (
                  <Music4 size={28} className="text-cyan-500" />
                ) : (
                  <FileText size={28} className="text-blue-400" />
                )}
              </div>

              <p className="truncate text-xs font-medium text-gray-700">{file.filename}</p>
              <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              {file.file_type === 'song' && (
                <p className="mt-1 text-[10px] font-medium text-cyan-600">Songs folder</p>
              )}

              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => openFile(file)} className="rounded bg-white/90 p-1 hover:bg-blue-50">
                  <ExternalLink size={12} className="text-blue-500" />
                </button>
                <button onClick={() => moveToRecycleBin(file)} className="rounded bg-white/90 p-1 hover:bg-red-50">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
