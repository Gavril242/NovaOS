import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, FileText, FolderOpen } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

interface TextFile {
  id: string;
  filename: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const Win11TextEditor: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const [content, setContent] = useState('');
  const [currentFile, setCurrentFile] = useState<TextFile | null>(null);
  const [files, setFiles] = useState<TextFile[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isSupabaseConfigured) loadFiles();
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;
    const { data, error: requestError } = await supabase.from('desktop_files')
      .select('*').eq('user_id', user.id).eq('file_type', 'text')
      .order('updated_at', { ascending: false });
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setFiles(data || []);
  };

  const createFile = async () => {
    if (!user || !newName.trim()) return;
    setIsLoading(true);
    setError(null);
    const { data, error: requestError } = await supabase.from('desktop_files')
      .insert([{ user_id: user.id, filename: newName.endsWith('.txt') ? newName : `${newName}.txt`, file_type: 'text', content: '' }])
      .select().single();
    if (requestError) {
      setError(requestError.message);
    }
    if (data) { setCurrentFile(data); setContent(''); setNewName(''); loadFiles(); }
    setIsLoading(false);
  };

  const saveFile = async () => {
    if (!user || !currentFile) return;
    setIsLoading(true);
    setError(null);
    const updated_at = new Date().toISOString();
    const { error: requestError } = await supabase.from('desktop_files')
      .update({ content, updated_at })
      .eq('id', currentFile.id);
    if (requestError) {
      setError(requestError.message);
      setIsLoading(false);
      return;
    }
    setCurrentFile({ ...currentFile, content, updated_at });
    loadFiles();
    setIsLoading(false);
  };

  const deleteFile = async (id: string) => {
    if (!user) return;
    const file = files.find((entry) => entry.id === id);
    if (file) {
      const { error: recycleError } = await supabase.from('recycle_bin').insert([
        {
          user_id: user.id,
          source_table: 'desktop_files',
          item_name: file.filename,
          payload: {
            filename: file.filename,
            file_type: 'text',
            content: file.content,
          },
        },
      ]);

      if (recycleError) {
        setError(recycleError.message);
        return;
      }
    }

    const { error: requestError } = await supabase.from('desktop_files').delete().eq('id', id);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    if (currentFile?.id === id) { setCurrentFile(null); setContent(''); }
    loadFiles();
  };

  // Fallback for demo mode
  const [localContent, setLocalContent] = useState('Welcome to Notepad!\n\nStart typing here...');

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="bg-gray-50 border-b border-gray-200 p-1 flex gap-1 text-xs">
          <span className="px-2 py-1 text-gray-600">File</span>
          <span className="px-2 py-1 text-gray-600">Edit</span>
          <span className="px-2 py-1 text-gray-600">View</span>
        </div>
        <textarea value={localContent} onChange={e => setLocalContent(e.target.value)}
          className="flex-1 p-3 outline-none resize-none text-sm font-mono text-gray-800 bg-white"
          spellCheck={false} />
        <div className="bg-gray-100 border-t border-gray-200 px-3 py-1 text-xs text-gray-500">
          {localContent.length} characters
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button onClick={() => setShowFiles(!showFiles)} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded text-xs text-gray-700">
          <FolderOpen size={14} /> Open
        </button>
        <button onClick={saveFile} disabled={!currentFile || isLoading}
          className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded text-xs text-gray-700 disabled:opacity-40">
          <Save size={14} /> Save
        </button>
        <button onClick={() => { setCurrentFile(null); setContent(''); }}
          className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded text-xs text-gray-700">
          <Plus size={14} /> New
        </button>
        {currentFile && (
          <button onClick={() => deleteFile(currentFile.id)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded text-xs text-red-500 ml-auto">
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {showFiles && (
          <div className="w-48 bg-gray-50 border-r border-gray-200 overflow-auto p-2">
            <div className="flex gap-1 mb-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFile()}
                placeholder="New file..." className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded" />
              <button onClick={createFile} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">+</button>
            </div>
            {files.map(f => (
              <button key={f.id} onClick={() => { setCurrentFile(f); setContent(f.content); setShowFiles(false); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 mb-0.5 ${
                  currentFile?.id === f.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                }`}>
                <FileText size={12} /> <span className="truncate">{f.filename}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 flex flex-col">
          {currentFile && <div className="text-xs text-gray-400 px-3 pt-2">{currentFile.filename}</div>}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={currentFile ? '' : 'Open a file or create a new one...'}
            className="flex-1 p-3 outline-none resize-none text-sm font-mono text-gray-800 bg-white"
            spellCheck={false} />
        </div>
      </div>

      <div className="bg-gray-100 border-t border-gray-200 px-3 py-1 text-xs text-gray-500">
        {currentFile ? currentFile.filename : 'No file open'} — {content.length} characters
      </div>
    </div>
  );
};
