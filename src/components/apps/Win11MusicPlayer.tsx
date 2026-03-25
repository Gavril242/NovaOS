import React from 'react';
import { Disc3, Music4, PlayCircle, Volume2, Waves } from 'lucide-react';

import type { StorageFileRow } from '@/types/novaos';

interface Win11MusicPlayerProps {
  songs: StorageFileRow[];
  currentSong: StorageFileRow | null;
  isPlaying: boolean;
  volume: number;
  onSelectSong: (song: StorageFileRow) => void;
  onTogglePlay: () => void;
  onSetVolume: (volume: number) => void;
  onNext: () => void;
}

export const Win11MusicPlayer: React.FC<Win11MusicPlayerProps> = ({
  songs,
  currentSong,
  isPlaying,
  volume,
  onSelectSong,
  onTogglePlay,
  onSetVolume,
  onNext,
}) => {

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,#1c365e_0%,#0d1731_42%,#060b17_100%)] text-white">
      <div className="border-b border-white/10 bg-black/10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Nova Audio</div>
            <div className="mt-1 text-2xl font-black tracking-tight">Misa Music Deck</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-cyan-200">
            <Disc3 size={28} className={isPlaying ? 'animate-spin' : ''} />
          </div>
        </div>
        <div className="mt-2 text-xs text-white/60">
          Upload audio in File Manager and it will appear here automatically.
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r border-white/10 overflow-auto bg-black/15 p-3">
          {songs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white/50">
              <Music4 size={42} className="mb-3" />
              <p className="text-sm">No music uploaded yet.</p>
            </div>
          ) : (
            songs.map((song) => (
              <button
                key={song.id}
                onClick={() => onSelectSong(song)}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                  currentSong?.id === song.id ? 'bg-cyan-500/20 ring-1 ring-cyan-300/30' : 'hover:bg-white/5'
                }`}
              >
                <PlayCircle size={18} className="text-cyan-300" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{song.filename}</div>
                  <div className="text-[11px] text-white/50">
                    {(song.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-8">
          {currentSong ? (
            <div className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,28,55,0.95),rgba(27,64,94,0.8))] p-8">
                  <div className="mb-8 flex items-center gap-4">
                    <div className="rounded-3xl bg-cyan-400/15 p-5 text-cyan-300">
                      <Music4 size={32} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Now Playing</p>
                      <h2 className="mt-2 text-2xl font-semibold">{currentSong.filename}</h2>
                      <p className="text-sm text-white/60">NovaOS local library</p>
                    </div>
                  </div>
                  <div className="mb-8 grid grid-cols-3 gap-3 text-center text-xs text-white/65">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <Volume2 size={16} className="mx-auto mb-2 text-cyan-300" />
                      {(volume * 100).toFixed(0)}% Volume
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <Waves size={16} className="mx-auto mb-2 text-cyan-300" />
                      {(currentSong.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <Disc3 size={16} className={`mx-auto mb-2 text-cyan-300 ${isPlaying ? 'animate-spin' : ''}`} />
                      {isPlaying ? 'Playing' : 'Paused'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={onTogglePlay} className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button onClick={onNext} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10">
                      Next Song
                    </button>
                  </div>
                </div>
                <div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-black/20 p-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/40">Playback</p>
                    <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                      <audio
                        key={currentSong.id}
                        src={currentSong.file_url}
                        controls
                        autoPlay={isPlaying}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                      <span>System volume</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(event) => onSetVolume(Number(event.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-white/50">
              <Music4 size={48} className="mx-auto mb-3" />
              <p>Select a song to play</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
