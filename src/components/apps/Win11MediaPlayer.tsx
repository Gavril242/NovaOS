import React, { useState } from 'react';
import { Play, Plus, Trash2, MonitorPlay } from 'lucide-react';

import { extractYouTubeVideoId } from '@/lib/novaos';

interface PlaylistItem {
  id: string;
  title: string;
  videoId: string;
}

export const Win11MediaPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [current, setCurrent] = useState<PlaylistItem | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');

  const addVideo = () => {
    if (!urlInput.trim() || !titleInput.trim()) return;
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) return;
    const item = { id: Date.now().toString(), title: titleInput, videoId };
    setPlaylist([...playlist, item]);
    if (!current) setCurrent(item);
    setUrlInput(''); setTitleInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]">
      <div className="flex-1 bg-black flex items-center justify-center">
        {current ? (
          <iframe
            width="100%" height="100%"
            src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1`}
            title={current.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="text-center text-gray-500">
            <MonitorPlay size={48} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm">Add a video to start</p>
          </div>
        )}
      </div>
      <div className="bg-[#16213e] p-3 border-t border-gray-700 max-h-60 overflow-auto">
        <div className="flex flex-col gap-2 mb-3">
          <input value={titleInput} onChange={e => setTitleInput(e.target.value)}
            placeholder="Video title..." className="px-3 py-1.5 bg-[#0f3460] rounded text-white text-sm outline-none placeholder-gray-500" />
          <div className="flex gap-2">
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addVideo()}
              placeholder="YouTube URL..." className="flex-1 px-3 py-1.5 bg-[#0f3460] rounded text-white text-sm outline-none placeholder-gray-500" />
            <button onClick={addVideo} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
        {playlist.map(item => (
          <div key={item.id} className={`flex items-center gap-2 px-3 py-2 rounded mb-1 ${current?.id === item.id ? 'bg-blue-600/30' : 'hover:bg-white/5'}`}>
            <button onClick={() => setCurrent(item)} className="flex-1 text-left flex items-center gap-2 text-sm text-white truncate">
              <Play size={12} className="text-blue-400 shrink-0" />{item.title}
            </button>
            <button onClick={() => { setPlaylist(p => p.filter(x => x.id !== item.id)); if (current?.id === item.id) setCurrent(null); }}
              className="p-1 hover:bg-red-500/30 rounded"><Trash2 size={12} className="text-red-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};
