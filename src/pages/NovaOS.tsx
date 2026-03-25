/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Folder, Chrome, Type, Calculator, Palette, X, Minus, Search,
  Volume2, Battery, ChevronUp, ArrowLeft, ArrowRight, RotateCw, Home,
  Save, FileText, Trash2, Settings, Power, Terminal, Newspaper, Music4, ArchiveRestore,
  Grid, Maximize2, Minimize2, Gamepad2, MessageCircle, Users, Bell,
  MonitorPlay, Cat, Upload, Lock, User, Mail, AlertTriangle, LogOut, Image as ImageIcon,
  Play, Pause, SkipForward, SkipBack
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildAvatarUrl, resolveRenderableUrl, toOSUser } from '@/lib/novaos';
import { useUserStore, type OSUser } from '@/stores/userStore';
import { DEFAULT_WALLPAPER, WALLPAPER_PRESETS } from '@/lib/wallpapers';
import { Win11Browser } from '@/components/apps/Win11Browser';
import { Win11Messenger } from '@/components/apps/Win11Messenger';
import { Win11Friends } from '@/components/apps/Win11Friends';
import { Win11Notifications } from '@/components/apps/Win11Notifications';
import { Win11MediaPlayer } from '@/components/apps/Win11MediaPlayer';
import { Win11MisaCatch } from '@/components/apps/Win11MisaCatch';
import { Win11TextEditor } from '@/components/apps/Win11TextEditor';
import { Win11FileManager } from '@/components/apps/Win11FileManager';
import { Win11MusicPlayer } from '@/components/apps/Win11MusicPlayer';
import { Win11RecycleBin } from '@/components/apps/Win11RecycleBin';
import { Win11SocialFeed } from '@/components/apps/Win11SocialFeed';
import { Win11Arcade } from '@/components/apps/Win11Arcade';
import type { StorageFileRow } from '@/types/novaos';

// --- CONSTANTS ---
const ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  explorer: { icon: Folder, color: "text-yellow-400", bg: "bg-blue-500" },
  chrome: { icon: Chrome, color: "text-blue-500", bg: "bg-white" },
  word: { icon: Type, color: "text-blue-700", bg: "bg-blue-100" },
  terminal: { icon: Terminal, color: "text-green-500", bg: "bg-black" },
  settings: { icon: Settings, color: "text-gray-600", bg: "bg-gray-100" },
  minesweeper: { icon: Gamepad2, color: "text-red-500", bg: "bg-gray-100" },
  messenger: { icon: MessageCircle, color: "text-sky-500", bg: "bg-sky-100" },
  friends: { icon: Users, color: "text-amber-500", bg: "bg-amber-100" },
  notifications: { icon: Bell, color: "text-yellow-500", bg: "bg-yellow-100" },
  mediaplayer: { icon: MonitorPlay, color: "text-purple-500", bg: "bg-purple-100" },
  musicplayer: { icon: Music4, color: "text-cyan-500", bg: "bg-cyan-100" },
  misacatch: { icon: Cat, color: "text-orange-500", bg: "bg-orange-100" },
  notepad: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  filemanager: { icon: Upload, color: "text-teal-500", bg: "bg-teal-100" },
  recyclebin: { icon: ArchiveRestore, color: "text-gray-600", bg: "bg-gray-100" },
  social: { icon: Newspaper, color: "text-pink-500", bg: "bg-pink-100" },
  arcade: { icon: Gamepad2, color: "text-fuchsia-500", bg: "bg-fuchsia-100" },
  photoviewer: { icon: ImageIcon, color: "text-emerald-500", bg: "bg-emerald-100" },
  calc: { icon: Calculator, color: "text-gray-700", bg: "bg-gray-200" },
  paint: { icon: Palette, color: "text-purple-500", bg: "bg-white" },
};

// --- FILE SYSTEM ---
const INITIAL_FILES = [
  { id: 'desktop', parentId: 'root', name: 'Desktop', type: 'folder' },
  { id: 'docs', parentId: 'root', name: 'Documents', type: 'folder' },
  { id: 'pics', parentId: 'root', name: 'Pictures', type: 'folder' },
  { id: 'songs', parentId: 'root', name: 'Songs', type: 'folder' },
  { id: 'projects', parentId: 'root', name: 'Nova Projects', type: 'folder' },
  { id: 'f1', parentId: 'desktop', name: 'Welcome.txt', type: 'txt', content: 'Welcome to NovaOS.\n\nThis desktop now runs with Supabase-backed apps for chat, friends, notifications, files, and notes.\n\nHighlights:\n- Realtime social updates\n- YouTube-ready Nova Browser\n- Calico-cat wallpapers inspired by Misa\n- Desktop personalization synced to your profile\n\nRight-click the desktop to personalize or create files.' },
  { id: 'f2', parentId: 'desktop', name: 'Resume_Gavril.txt', type: 'txt', content: 'GAVRIL - Python Programmer\nContinental QL\n\n=== PROFESSIONAL SUMMARY ===\nPassionate Python developer with expertise in automation, data analysis, and full-stack development.\n\n=== SKILLS ===\n• Python, JavaScript, React, TypeScript\n• Agile, Scrum, TDD\n• Git, Docker, CI/CD\n• Pandas, NumPy, Data Analysis\n\n=== EXPERIENCE ===\nPython Programmer | Continental QL\n- Automated testing frameworks\n- Data analysis pipelines\n- Agile team collaboration\n\n=== INTERESTS ===\n🐱 Cats  🌱 Plants  🎮 Gaming  💻 Open Source' },
  { id: 'f3', parentId: 'docs', name: 'Meeting_Notes.txt', type: 'txt', content: 'Daily Standup Notes\n==================\n\nMonday:\n- New feature implementation\n- Code review pending\n\nTuesday:\n- Pair programming on data pipeline\n- Bug fixes in production' },
  { id: 'f4', parentId: 'projects', name: 'misa_wallpaper_sync.py', type: 'code', content: '#!/usr/bin/env python3\n"""Tiny helper for syncing NovaOS wallpaper presets."""\n\nCALICO_WALLPAPERS = [\n    "Assisi Calico",\n    "Yawning Calico",\n    "Sakurajima Calico",\n]\n\nfor wallpaper in CALICO_WALLPAPERS:\n    print(f"Loaded: {wallpaper}")' },
  { id: 'f5', parentId: 'projects', name: 'plant_monitor.py', type: 'code', content: '#!/usr/bin/env python3\n"""Plant Moisture Monitor"""\n\nimport random\n\ndef check_plants():\n    moisture = random.randint(20, 80)\n    print(f"Moisture: {moisture}%")\n    if moisture < 50:\n        print("💧 Watering plants...")\n    else:\n        print("✓ Moisture OK")\n\ncheck_plants()' },
  { id: 'f6', parentId: 'projects', name: 'nova_social_sync.py', type: 'code', content: '#!/usr/bin/env python3\n"""Realtime message and friend-event checklist."""\n\nchecks = [\n    "messages publication enabled",\n    "friends publication enabled",\n    "notifications trigger enabled",\n]\n\nfor item in checks:\n    print(f"[ok] {item}")' },
];

const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const getDate = () => new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const playUISound = (frequency: number, duration = 0.08, type: OscillatorType = 'sine') => {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.035;

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();

  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
  oscillator.onended = () => {
    context.close().catch(() => undefined);
  };
};

// ==================== LOCK SCREEN ====================
const LockScreen = ({ wallpaper, onUnlock }: { wallpaper: string; onUnlock: (user: OSUser) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [currentTime, setCurrentTime] = useState(getTime());
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(getTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // Check existing session
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data: profile }) => {
            onUnlock(toOSUser(session.user, profile));
          });
      }
    });
  }, []);

  const handleDemoLogin = () => {
    const username = form.username || 'Misa Guest';
    onUnlock({
      id: 'demo-user', email: 'demo@novaos.app', username,
      avatar_url: buildAvatarUrl(username), high_score: 0, created_at: new Date().toISOString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) { handleDemoLogin(); return; }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: form.email, password: form.password,
        });
        if (authErr) throw authErr;
        if (data.user) {
          let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (!profile) {
            const username = data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User';
            const avatar_url = buildAvatarUrl(username);
            await supabase.from('profiles').insert([{ id: data.user.id, email: data.user.email, username, avatar_url, high_score: 0 }]);
            profile = { username, avatar_url, high_score: 0 };
          }
          onUnlock(toOSUser(data.user, profile));
        }
      } else {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { username: form.username } },
        });
        if (signUpErr) throw signUpErr;
        if (data.user) {
          const avatar_url = buildAvatarUrl(form.username);
          await supabase.from('profiles').insert([{ id: data.user.id, email: form.email, username: form.username, avatar_url, high_score: 0 }]);
          onUnlock(toOSUser(data.user, { email: form.email, username: form.username, avatar_url, high_score: 0 }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="h-screen w-screen bg-cover bg-center flex flex-col items-center justify-center text-white cursor-pointer relative"
        style={{ backgroundImage: `url(${wallpaper})` }} onClick={() => setShowForm(true)}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div className="relative z-10 text-center">
          <div className="text-8xl font-light tracking-tighter mb-4 drop-shadow-lg">{currentTime}</div>
          <div className="text-2xl font-medium drop-shadow-md">{getDate()}</div>
        </div>
        <div className="relative z-10 animate-bounce mt-24 flex items-center gap-2 text-sm font-medium opacity-80">
          <ChevronUp size={16} /> Click to sign in
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center relative"
      style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-lg">
              <User size={36} />
            </div>
            <h2 className="text-white text-lg font-semibold">{isLogin ? 'Welcome back' : 'Create account'}</h2>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-300 mt-0.5 shrink-0" />
              <p className="text-yellow-200 text-xs">Demo mode — no Supabase configured. Enter any name to continue into NovaOS.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {(!isLogin || !isSupabaseConfigured) && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                <input type="text" placeholder="Username" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-blue-400 transition-all text-sm"
                  required={!isLogin || !isSupabaseConfigured} />
              </div>
            )}
            {isSupabaseConfigured && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                  <input type="email" placeholder="Email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-blue-400 transition-all text-sm" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                  <input type="password" placeholder="Password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-blue-400 transition-all text-sm" required />
                </div>
              </>
            )}

            {error && <div className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs">{error}</div>}

            <button type="submit" disabled={isLoading}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 text-sm mt-2">
              {isLoading ? 'Loading...' : !isSupabaseConfigured ? 'Enter Demo Mode' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {isSupabaseConfigured && (
            <p className="mt-4 text-center text-white/50 text-xs">
              {isLogin ? "Don't have an account? " : 'Already have one? '}
              <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-blue-300 hover:text-blue-200 font-medium">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          )}
        </div>

        <button onClick={() => setShowForm(false)} className="mt-4 w-full text-center text-white/40 text-xs hover:text-white/60">
          ← Back to clock
        </button>
      </div>
    </div>
  );
};

// ==================== MINESWEEPER ====================
const Minesweeper = () => {
  const [board, setBoard] = useState<any[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagCount, setFlagCount] = useState(0);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const ROWS = 9, COLS = 9, MINES = 10;

  useEffect(() => { initBoard(); }, []);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const initBoard = () => {
    const b = Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 })));
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
      if (!b[r][c].isMine) { b[r][c].isMine = true; placed++; }
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!b[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc].isMine) count++;
        }
        b[r][c].neighborMines = count;
      }
    }
    setBoard(b); setGameState('playing'); setFlagCount(0); setTime(0); setIsRunning(false);
  };

  const reveal = (row: number, col: number) => {
    if (gameState !== 'playing' || board[row][col].isRevealed || board[row][col].isFlagged) return;
    if (!isRunning) setIsRunning(true);
    const b = board.map(r => r.map(c => ({ ...c })));
    if (b[row][col].isMine) {
      b.forEach(r => r.forEach(c => { if (c.isMine) c.isRevealed = true; }));
      setBoard(b); setGameState('lost'); setIsRunning(false); return;
    }
    const flood = (r: number, c: number) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c].isRevealed || b[r][c].isMine) return;
      b[r][c].isRevealed = true;
      if (b[r][c].neighborMines === 0) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(r + dr, c + dc);
    };
    flood(row, col);
    setBoard(b);
    if (b.every(r => r.every(c => c.isMine || c.isRevealed))) { setGameState('won'); setIsRunning(false); }
  };

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState !== 'playing' || board[r][c].isRevealed) return;
    const b = board.map(row => row.map(cell => ({ ...cell })));
    b[r][c].isFlagged = !b[r][c].isFlagged;
    setFlagCount(b.flat().filter(c => c.isFlagged).length);
    setBoard(b);
  };

  const numColors = ['', 'text-blue-600', 'text-green-600', 'text-red-600', 'text-purple-600', 'text-orange-600', 'text-teal-600', 'text-black', 'text-gray-600'];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6">
        <div className="flex justify-between items-center mb-4 gap-8">
          <div className="bg-gray-800 text-red-500 px-4 py-2 rounded font-mono text-xl font-bold min-w-[80px] text-center">{String(MINES - flagCount).padStart(3, '0')}</div>
          <button onClick={initBoard} className="text-4xl hover:scale-110 transition-transform">
            {gameState === 'lost' ? '😵' : gameState === 'won' ? '😎' : '🙂'}
          </button>
          <div className="bg-gray-800 text-red-500 px-4 py-2 rounded font-mono text-xl font-bold min-w-[80px] text-center">{String(time).padStart(3, '0')}</div>
        </div>
        <div className="border-4 border-gray-400 bg-gray-300 p-2">
          {board.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell: any, c: number) => (
                <button key={c} onClick={() => reveal(r, c)} onContextMenu={(e) => toggleFlag(e, r, c)}
                  className={`w-8 h-8 border border-gray-400 flex items-center justify-center font-bold text-sm transition-colors ${
                    !cell.isRevealed ? 'bg-gray-300 hover:bg-gray-200 shadow-sm' : cell.isMine ? 'bg-red-500 text-white' : 'bg-gray-100'
                  } ${numColors[cell.neighborMines] || ''}`}
                  disabled={gameState !== 'playing'}>
                  {cell.isFlagged ? '🚩' : !cell.isRevealed ? '' : cell.isMine ? '💣' : cell.neighborMines || ''}
                </button>
              ))}
            </div>
          ))}
        </div>
        {gameState === 'won' && <div className="mt-4 text-center text-green-600 font-bold text-xl animate-bounce">🎉 You Won! 🎉</div>}
        {gameState === 'lost' && <div className="mt-4 text-center text-red-600 font-bold text-xl">💥 Game Over! 💥</div>}
      </div>
    </div>
  );
};

// ==================== APP COMPONENTS (inline) ====================

const AppExplorer = ({ files, storageFiles, onOpenFile, onOpenStorageFile, onItemContextMenu, currentPath, onNavigate, theme }: any) => {
  const currentFolder = files.find((f: any) => f.id === currentPath) || { name: 'Root' };
  const currentFiles = files.filter((f: any) => f.parentId === currentPath);
  const pictureFiles = (storageFiles || []).filter((file: StorageFileRow) => file.file_type === 'photo');
  const songFiles = (storageFiles || []).filter((file: StorageFileRow) => file.file_type === 'song');
  const storageEntries =
    currentPath === 'pics' ? pictureFiles : currentPath === 'songs' ? songFiles : [];
  const totalItems = currentFiles.length + storageEntries.length;
  const handleUp = () => {
    if (currentPath === 'root') return;
    const parent = files.find((f: any) => f.id === currentPath);
    onNavigate(parent?.parentId || 'root');
  };

  return (
    <div className={`flex flex-col h-full text-sm ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-800'}`}>
      <div className={`flex items-center gap-4 p-2 border-b ${theme === 'dark' ? 'border-white/10 bg-slate-950 text-slate-300' : 'border-gray-200 bg-[#f0f4f9] text-gray-500'}`}>
        <div className="flex gap-1">
          <button onClick={handleUp} className={`p-1.5 rounded-md disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`} disabled={currentPath === 'root'}><ArrowLeft size={16} /></button>
          <button className={`p-1.5 rounded-md disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`} disabled><ArrowRight size={16} /></button>
          <button onClick={handleUp} className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}><ChevronUp size={16} /></button>
        </div>
        <div className={`flex-1 flex items-center rounded-md px-3 py-1.5 text-xs shadow-sm border ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-slate-200' : 'bg-white border-gray-300'}`}>
          <Monitor size={14} className="mr-2" />
          <span>{currentPath === 'root' ? 'This PC' : `This PC > ${currentFolder.name}`}</span>
        </div>
        <div className={`w-48 rounded-md px-3 py-1.5 flex items-center text-xs shadow-sm border ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-white border-gray-300 text-gray-400'}`}>
          <Search size={14} className="mr-2" /><span>Search</span>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`w-44 border-r p-2 hidden sm:flex flex-col gap-1 text-xs ${theme === 'dark' ? 'border-white/10 bg-slate-950' : 'border-gray-200 bg-white'}`}>
          <button onClick={() => onNavigate('root')} className={`flex items-center gap-2 px-2 py-1.5 rounded ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${currentPath === 'root' ? 'bg-blue-500/15 text-blue-400 font-medium' : theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            <Home size={16} className={currentPath === 'root' ? 'text-blue-500' : theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} /> Home
          </button>
          <div className={`my-1 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`} />
          {[{ id: 'desktop', icon: Monitor, color: 'text-purple-500', label: 'Desktop' },
            { id: 'docs', icon: FileText, color: 'text-yellow-500', label: 'Documents' },
            { id: 'pics', icon: ImageIcon, color: 'text-pink-500', label: 'Pictures' },
            { id: 'songs', icon: Music4, color: 'text-cyan-500', label: 'Songs' },
            { id: 'projects', icon: Terminal, color: 'text-green-500', label: 'Projects' }
          ].map(n => (
            <button key={n.id} onClick={() => onNavigate(n.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded ${theme === 'dark' ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}>
              <n.icon size={16} className={n.color} /> {n.label}
            </button>
          ))}
        </div>
        <div className={`flex-1 p-4 overflow-y-auto ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          {currentPath === 'root' ? (
            <div>
              <h2 className={`text-xs font-bold mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Folders</h2>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {files.filter((f: any) => f.parentId === 'root').map((f: any) => (
                  <div key={f.id} onDoubleClick={() => onNavigate(f.id)} onContextMenu={(event) => onItemContextMenu(event, f)} className={`group flex flex-col items-center gap-2 p-2 rounded cursor-pointer ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-blue-50'}`}>
                    <Folder size={48} className="text-yellow-400 fill-yellow-400" />
                    <span className={`text-xs text-center font-medium ${theme === 'dark' ? 'text-slate-200 group-hover:text-blue-300' : 'group-hover:text-blue-600'}`}>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {totalItems === 0 && <div className={`col-span-full text-center py-10 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>This folder is empty.</div>}
              {currentFiles.map((f: any) => (
                <div key={f.id} onDoubleClick={() => f.type === 'folder' ? onNavigate(f.id) : onOpenFile(f)} onContextMenu={(event) => onItemContextMenu(event, f)}
                  className={`group flex flex-col items-center gap-2 p-2 rounded cursor-pointer ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-blue-50'}`}>
                  {f.type === 'folder' ? <Folder size={40} className="text-yellow-400 fill-yellow-400" /> :
                   f.type === 'code' ? <div className="relative"><FileText size={40} className="text-gray-600" /><div className="absolute bottom-0 right-0 bg-green-500 text-white text-[8px] font-bold px-1 rounded">PY</div></div> :
                   <FileText size={40} className="text-blue-500" />}
                  <span className={`text-xs text-center w-full truncate ${theme === 'dark' ? 'text-slate-200 group-hover:text-blue-300' : 'group-hover:text-blue-600'}`}>{f.name}</span>
                </div>
              ))}
              {storageEntries.map((file: StorageFileRow) => (
                <div
                  key={file.id}
                  onDoubleClick={() => onOpenStorageFile(file)}
                  onContextMenu={(event) => onItemContextMenu(event, file)}
                  className={`group flex flex-col items-center gap-2 p-2 rounded cursor-pointer ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-blue-50'}`}
                >
                  <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {file.file_type === 'photo' ? (
                      <img src={file.file_url} alt={file.filename} className="h-full w-full object-cover" />
                    ) : (
                      <Music4 size={28} className="text-cyan-500" />
                    )}
                  </div>
                  <span className={`text-xs text-center w-full truncate ${theme === 'dark' ? 'text-slate-200 group-hover:text-blue-300' : 'group-hover:text-blue-600'}`}>{file.filename}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={`h-6 border-t flex items-center px-3 text-xs gap-4 ${theme === 'dark' ? 'bg-slate-950 border-white/10 text-slate-400' : 'bg-white border-gray-200 text-gray-500'}`}>
        <span>{totalItems} items</span>
      </div>
    </div>
  );
};

const AppChrome = () => {
  return <Win11Browser />;
};

const AppPhotoViewer = ({ file, theme }: any) => {
  if (!file) {
    return <div className={`flex h-full items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-400' : 'bg-white text-gray-400'}`}>No image selected.</div>;
  }

  return (
    <div className={`flex h-full items-center justify-center p-6 ${theme === 'dark' ? 'bg-slate-950' : 'bg-[#f4f6fb]'}`}>
      <div className={`max-h-full max-w-5xl overflow-hidden rounded-[28px] border p-3 shadow-2xl ${theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <img src={file.preview_url || file.file_url} alt={file.filename} className="max-h-[75vh] w-full rounded-3xl object-contain" />
        <div className={`px-3 pb-2 pt-4 text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>{file.filename}</div>
      </div>
    </div>
  );
};

const AppTerminal = () => {
  const [history, setHistory] = useState(['Windows PowerShell', 'Copyright (C) Microsoft Corporation.', '', 'PS C:\\Users\\Gavril> ']);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [history]);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const h = [...history];
    h[h.length - 1] += input;
    const cmd = input.trim().toLowerCase();
    let res = null;
    if (cmd === 'help') res = 'Available: help, dir, cls, python, whoami, neofetch';
    else if (cmd === 'dir' || cmd === 'ls') res = '    Directory: C:\\Users\\Gavril\n\n-a----   cat_feeder.py\n-a----   Resume.txt\n-a----   plant_monitor.py';
    else if (cmd === 'cls' || cmd === 'clear') { setHistory(['PS C:\\Users\\Gavril> ']); setInput(''); return; }
    else if (cmd === 'whoami') res = 'continental\\gavril';
    else if (cmd === 'neofetch') res = '    ██████  Gavril@NovaOS\n   ██    ██  OS: NovaOS Web Desktop\n   ██    ██  Shell: PowerShell 7.3\n    ██████   CPU: React 18 Cores\n             RAM: ∞ (JavaScript)';
    else if (cmd.startsWith('python')) res = 'Python 3.11.2\n>>> print("Hello World")\nHello World';
    else if (cmd !== '') res = `'${cmd}' is not recognized as a command.`;
    if (res) h.push(res);
    h.push('PS C:\\Users\\Gavril> ');
    setHistory(h); setInput('');
  };
  return (
    <div className="h-full bg-[#012456] text-gray-200 font-mono text-sm p-3 overflow-auto cursor-text"
      onClick={() => document.getElementById('term-input')?.focus()}>
      {history.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap break-words">
          {line}
          {i === history.length - 1 && (
            <input id="term-input" className="bg-transparent border-none outline-none text-gray-200 w-1/2 ml-1"
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} autoFocus />
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

const AppSettings = ({ currentWallpaper, onSetWallpaper, user, onLogout, onSaveProfile, theme, resolvedAvatarUrl }: any) => {
  const [draft, setDraft] = useState({
    bio: user?.bio || '',
    status_text: user?.status_text || '',
    theme: user?.theme || 'light',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft({
      bio: user?.bio || '',
      status_text: user?.status_text || '',
      theme: user?.theme || 'light',
    });
  }, [user?.bio, user?.status_text, user?.theme]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) {
      return;
    }

    const file = event.target.files[0];
    const path = `${user.id}/avatars/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error } = await supabase.storage.from('user-files').upload(path, file, { upsert: true });
    if (error) {
      return;
    }

    onSaveProfile({ avatar_url: `storage://user-files/${path}` });
  };

  const saveProfile = async () => {
    setIsSaving(true);
    await onSaveProfile(draft);
    setIsSaving(false);
  };

  return (
    <div className={`flex h-full ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-[#f3f3f3]'}`}>
      <div className="w-56 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-10 h-10 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {resolvedAvatarUrl ? (
              <img
                src={resolvedAvatarUrl}
                alt={user.username}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = buildAvatarUrl(user?.username || 'User');
                }}
              />
            ) : (
              user?.username?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div><div className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{user?.username || 'User'}</div><div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{user?.email || ''}</div></div>
        </div>
        <div className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-blue-400 flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white text-blue-600'}`}><Palette size={16}/> Personalization</div>
        <div className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-gray-200 text-gray-600'}`}><User size={16}/> Profile</div>
        <div className="mt-auto">
          <button onClick={onLogout} className="w-full px-4 py-2 hover:bg-red-50 rounded-md text-sm text-red-500 flex items-center gap-2"><LogOut size={16}/> Sign Out</button>
        </div>
      </div>
      <div className={`flex-1 p-8 overflow-auto rounded-tl-xl shadow-sm border-l ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-200'}`}>
        <h1 className={`text-2xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Personalization & Profile</h1>
        <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="mb-8">
              <div className="h-48 rounded-lg bg-cover bg-center mb-4 shadow-md transition-all duration-500" style={{ backgroundImage: `url(${currentWallpaper})` }} />
              <div className={`mb-4 flex items-center justify-between rounded-xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                <div>
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Dark mode</h3>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>Switch the desktop shell between light and dark.</p>
                </div>
                <button
                  onClick={() => setDraft((current: any) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}
                  className={`rounded-full px-4 py-2 text-xs font-medium ${
                    draft.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {draft.theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </div>
              <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Choose Misa's calico wallpaper set</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {WALLPAPER_PRESETS.map((wallpaper) => (
                  <div key={wallpaper.id} className={`rounded-xl border p-2 shadow-sm ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                    <button
                      onClick={() => onSetWallpaper(wallpaper.url)}
                      className={`h-24 w-full rounded-lg bg-cover bg-center border-2 transition-all ${
                        currentWallpaper === wallpaper.url
                          ? 'border-blue-500 scale-[1.01] shadow-lg'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundImage: `url(${wallpaper.url})` }}
                    />
                    <div className="mt-2 px-1">
                      <div className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{wallpaper.name}</div>
                      <a href={wallpaper.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline">
                        Source: {wallpaper.sourceLabel}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className={`rounded-2xl border p-5 ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
              <h3 className={`mb-4 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Profile</h3>
              <div className="mb-4 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
                  {resolvedAvatarUrl ? (
                    <img
                      src={resolvedAvatarUrl}
                      alt={user.username}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = buildAvatarUrl(user?.username || 'User');
                      }}
                    />
                  ) : null}
                </div>
                <label className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-medium text-white hover:bg-blue-600 cursor-pointer">
                  Upload profile photo
                  <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
                </label>
              </div>
              <div className="space-y-3">
                <input
                  value={draft.status_text}
                  onChange={(event) => setDraft((current: any) => ({ ...current, status_text: event.target.value }))}
                  placeholder="Status"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-white' : 'border-gray-200 bg-white'}`}
                />
                <textarea
                  value={draft.bio}
                  onChange={(event) => setDraft((current: any) => ({ ...current, bio: event.target.value }))}
                  placeholder="Bio"
                  className={`min-h-28 w-full rounded-xl border px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-white' : 'border-gray-200 bg-white'}`}
                />
                <button onClick={saveProfile} disabled={isSaving} className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>About</h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>NovaOS is Misa's calico-inspired web desktop, rebuilt on Supabase for realtime chat, friends, notifications, notes, file sharing, music, and social posts.</p>
              {user?.high_score > 0 && <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>🏆 High Score (Misa's Catch): {user.high_score}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppWord = ({ file, onSave }: any) => {
  const [content, setContent] = useState(file ? file.content : '');
  useEffect(() => { if (file) setContent(file.content); }, [file]);
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-blue-700 text-white p-1 text-xs flex gap-4"><span>AutoSave On</span> <span>{file ? file.name : 'Untitled'}</span></div>
      <div className="bg-gray-50 border-b p-2 flex gap-2 shadow-sm">
        <button className="p-1 hover:bg-gray-200 rounded text-blue-600" onClick={() => onSave(content)}><Save size={20} /></button>
        <div className="w-px bg-gray-300 h-6 mx-1" />
        <button className="p-1 hover:bg-gray-200 rounded font-bold text-gray-700">B</button>
        <button className="p-1 hover:bg-gray-200 rounded italic text-gray-700">I</button>
        <button className="p-1 hover:bg-gray-200 rounded underline text-gray-700">U</button>
      </div>
      <div className="flex-1 bg-gray-100 p-8 overflow-auto flex justify-center">
        <textarea className="w-[21cm] min-h-[29.7cm] bg-white shadow-lg p-12 outline-none resize-none text-gray-800 leading-relaxed"
          value={content} onChange={e => setContent(e.target.value)} spellCheck={false} />
      </div>
      <div className="bg-blue-700 text-white text-xs px-2 py-0.5">{content.length} characters</div>
    </div>
  );
};

// ==================== CALCULATOR ====================
const AppCalculator = () => {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const input = (n: string) => {
    if (fresh) { setDisplay(n); setFresh(false); }
    else setDisplay(display === '0' ? n : display + n);
  };
  const doOp = (o: string) => {
    if (prev !== null && op && !fresh) {
      const res = op === '+' ? prev + parseFloat(display) : op === '-' ? prev - parseFloat(display) : op === '×' ? prev * parseFloat(display) : prev / parseFloat(display);
      setDisplay(String(res));
      setPrev(res);
    } else { setPrev(parseFloat(display)); }
    setOp(o); setFresh(true);
  };
  const equals = () => {
    if (prev !== null && op) {
      const cur = parseFloat(display);
      const res = op === '+' ? prev + cur : op === '-' ? prev - cur : op === '×' ? prev * cur : prev / cur;
      setDisplay(String(res)); setPrev(null); setOp(null); setFresh(true);
    }
  };
  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setFresh(true); };

  const btn = (label: string, onClick: () => void, cls = '') => (
    <button onClick={onClick} className={`p-3 rounded-md text-sm font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors ${cls}`}>{label}</button>
  );

  return (
    <div className="flex flex-col h-full bg-[#f3f3f3] p-4">
      <div className="text-right text-3xl font-light text-gray-800 p-4 bg-white rounded-lg mb-3 shadow-sm border border-gray-200 min-h-[60px] flex items-center justify-end">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {btn('%', () => setDisplay(String(parseFloat(display) / 100)), 'text-gray-600')}
        {btn('CE', clear, 'text-gray-600')}
        {btn('C', clear, 'text-gray-600')}
        {btn('⌫', () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0'), 'text-gray-600')}
        {btn('1/x', () => setDisplay(String(1 / parseFloat(display))), 'text-gray-600')}
        {btn('x²', () => setDisplay(String(Math.pow(parseFloat(display), 2))), 'text-gray-600')}
        {btn('√', () => setDisplay(String(Math.sqrt(parseFloat(display)))), 'text-gray-600')}
        {btn('÷', () => doOp('÷'), 'text-gray-600')}
        {['7','8','9'].map(n => btn(n, () => input(n), 'bg-white'))}
        {btn('×', () => doOp('×'), 'text-gray-600')}
        {['4','5','6'].map(n => btn(n, () => input(n), 'bg-white'))}
        {btn('-', () => doOp('-'), 'text-gray-600')}
        {['1','2','3'].map(n => btn(n, () => input(n), 'bg-white'))}
        {btn('+', () => doOp('+'), 'text-gray-600')}
        {btn('±', () => setDisplay(String(-parseFloat(display))), 'bg-white')}
        {btn('0', () => input('0'), 'bg-white')}
        {btn('.', () => { if (!display.includes('.')) setDisplay(display + '.'); }, 'bg-white')}
        {btn('=', equals, 'bg-blue-500 text-white hover:bg-blue-600')}
      </div>
    </div>
  );
};

// ==================== START MENU ====================
const StartMenu = ({ apps, files, onOpenApp, onOpenFile, isOpen, user, onLogout, theme }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  if (!isOpen) return null;
  const pinnedApps = ['explorer', 'chrome', 'social', 'messenger', 'friends', 'notifications', 'filemanager', 'musicplayer', 'arcade', 'notepad', 'recyclebin', 'settings'];
  const labels: Record<string, string> = {
    chrome: 'Browser',
    mediaplayer: 'Media',
    musicplayer: 'Music',
    misacatch: 'Misa Cat',
    filemanager: 'Files',
    notifications: 'Alerts',
    recyclebin: 'Recycle Bin',
    social: 'Nova Feed',
    calc: 'Calc',
  };
  const searchableApps = Object.keys(apps);
  const lowerQuery = searchQuery.trim().toLowerCase();
  const appResults = lowerQuery
    ? searchableApps.filter((key) => (labels[key] || key).toLowerCase().includes(lowerQuery))
    : [];
  const fileResults = lowerQuery
    ? files.filter((file: any) => file.name.toLowerCase().includes(lowerQuery)).slice(0, 8)
    : [];
  return (
    <div className={`absolute bottom-14 left-1/2 -translate-x-1/2 w-[620px] max-w-[95vw] h-[680px] backdrop-blur-xl rounded-xl shadow-2xl border flex flex-col overflow-hidden z-[9999] ${theme === 'dark' ? 'bg-slate-900/95 border-white/10 text-white' : 'bg-white/95 border-gray-200'}`}>
      <div className="p-6 flex-1 overflow-auto">
        <div className={`mb-6 w-full rounded-full border px-4 py-2.5 ${theme === 'dark' ? 'border-white/10 bg-white/5 text-slate-400' : 'border-gray-200 bg-gray-100 text-gray-400'}`}>
          <div className="flex items-center gap-2">
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search apps, settings, files"
              className={`w-full bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-white placeholder:text-slate-500' : 'text-gray-700 placeholder:text-gray-400'}`}
            />
          </div>
        </div>
        {lowerQuery ? (
          <div className="mb-6 space-y-4">
            <div>
              <h3 className={`mb-2 px-1 text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Apps</h3>
              <div className="grid grid-cols-2 gap-2">
                {appResults.map((key) => {
                  const app = apps[key];
                  const Icon = app.icon;
                  return (
                    <button key={key} onClick={() => onOpenApp(key)} className={`flex items-center gap-3 rounded-xl p-3 text-left ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                      <Icon size={22} className={app.color} />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-gray-700'}`}>{labels[key] || key}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className={`mb-2 px-1 text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Files</h3>
              <div className="grid grid-cols-2 gap-2">
                {fileResults.map((file: any) => (
                  <button key={file.id} onClick={() => onOpenFile(file)} className={`flex items-center gap-3 rounded-xl p-3 text-left ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                    <FileText size={20} className="text-blue-500" />
                    <span className={`truncate text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-gray-700'}`}>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Pinned</h3>
            </div>
            <div className="grid grid-cols-6 gap-y-4 gap-x-2 mb-6">
              {pinnedApps.map(key => {
                const app = apps[key];
                if (!app) return null;
                const Icon = app.icon;
                return (
                  <button key={key} onClick={() => onOpenApp(key)} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                    <div className={`p-2 rounded-lg ${key === 'terminal' ? 'bg-gray-800' : 'bg-transparent'}`}>
                      <Icon size={28} className={`${app.color} group-hover:scale-110 transition-transform duration-200`} />
                    </div>
                    <span className={`text-[11px] font-medium capitalize ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{labels[key] || key}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Recommended</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><FileText className="text-blue-600" size={24} /><div><span className={`text-xs font-semibold block ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Resume_Gavril.txt</span><span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Just now</span></div></div>
          <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Terminal className="text-green-600" size={24} /><div><span className={`text-xs font-semibold block ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>nova_social_sync.py</span><span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>2h ago</span></div></div>
        </div>
      </div>
      <div className={`h-14 border-t flex items-center justify-between px-8 ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
            {user?.username?.charAt(0).toUpperCase() || 'N'}
          </div>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{user?.username || 'NovaOS User'}</span>
        </div>
        <button onClick={onLogout} className={`p-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}><Power size={18} /></button>
      </div>
    </div>
  );
};

// ==================== DESKTOP ICON ====================
const DesktopIcon = ({ icon: Icon, label, onDblClick, onContextMenu, color }: any) => (
  <div data-desktop-icon className="w-24 flex flex-col items-center gap-1 p-2 hover:bg-white/10 border border-transparent hover:border-white/20 rounded cursor-pointer transition-colors group"
    onDoubleClick={onDblClick} onContextMenu={onContextMenu}>
    <Icon size={36} className={`${color} drop-shadow-md group-hover:scale-105 transition-transform`} />
    <span className="text-xs text-white text-center font-medium drop-shadow-md line-clamp-2 leading-tight">{label}</span>
  </div>
);

// ==================== DRAGGABLE WINDOW ====================
const DraggableWindow = ({ win, isActive, children, onFocus, onClose, onMinimize, onMaximize, onResize, theme }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState('');

  const handleMouseDown = (e: React.MouseEvent) => {
    if (win.isMaximized || (e.target as HTMLElement).closest('[data-no-drag]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - win.pos.x, y: e.clientY - win.pos.y });
    onFocus();
  };

  const handleResizeDown = (e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    setIsResizing(true); setResizeDir(dir);
    setDragStart({ x: e.clientX, y: e.clientY });
    onFocus();
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (isDragging) onResize(win.size, { x: e.clientX - dragStart.x, y: Math.max(0, e.clientY - dragStart.y) });
      if (isResizing) {
        const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
        let w = win.size.w, h = win.size.h;
        if (resizeDir.includes('e')) w = Math.max(300, win.size.w + dx);
        if (resizeDir.includes('s')) h = Math.max(200, win.size.h + dy);
        onResize({ w, h }, win.pos);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };
    const up = () => { setIsDragging(false); setIsResizing(false); };
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isDragging, isResizing, dragStart]);

  if (!win) return null;
  const style = win.isMaximized
    ? { top: 0, left: 0, width: '100%', height: 'calc(100% - 48px)', borderRadius: 0 }
    : { top: win.pos.y, left: win.pos.x, width: win.size.w, height: win.size.h, borderRadius: '0.5rem' };
  const AppIcon = ICONS[win.appId]?.icon;

  return (
    <div data-window-root className={`absolute shadow-2xl flex flex-col border overflow-hidden transition-all duration-200 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} ${win.isMinimized ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'} ${isActive ? 'border-blue-300/50 shadow-blue-500/10' : theme === 'dark' ? 'border-white/10' : 'border-gray-300'}`}
      style={{ ...style, zIndex: win.zIndex }} onMouseDown={onFocus}>
      <div className={`h-9 border-b flex items-center justify-between px-2 select-none ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-gray-50 border-gray-200'}`} onMouseDown={handleMouseDown}
        onDoubleClick={() => onMaximize()}>
        <div className="flex items-center gap-2 pl-2">
          {AppIcon && <AppIcon size={14} className={ICONS[win.appId]?.color || 'text-gray-600'} />}
          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-gray-700'}`}>{win.title}</span>
        </div>
        <div className="flex items-center h-full" data-no-drag>
          <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className={`h-full w-10 flex items-center justify-center transition-transform hover:scale-105 ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}><Minus size={14} className={theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} /></button>
          <button onClick={(e) => { e.stopPropagation(); onMaximize(); }} className={`h-full w-10 flex items-center justify-center transition-transform hover:scale-105 ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>{win.isMaximized ? <Minimize2 size={14} className={theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} /> : <Maximize2 size={14} className={theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} />}</button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="h-full w-10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"><X size={14} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {children}
        {(isDragging || isResizing) && <div className="absolute inset-0 bg-transparent z-50" />}
      </div>
      {!win.isMaximized && (
        <>
          <div className="absolute right-0 top-0 w-1 h-full cursor-e-resize hover:bg-blue-500/50" onMouseDown={e => handleResizeDown(e, 'e')} />
          <div className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/50" onMouseDown={e => handleResizeDown(e, 's')} />
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/50 rounded-tl" onMouseDown={e => handleResizeDown(e, 'se')} />
        </>
      )}
    </div>
  );
};

// ==================== MAIN OS COMPONENT ====================
export default function NovaOS() {
  const user = useUserStore(s => s.user);
  const setUser = useUserStore(s => s.setUser);
  const clearUser = useUserStore(s => s.clearUser);
  const storeWallpaper = useUserStore(s => s.wallpaper);
  const setStoreWallpaper = useUserStore(s => s.setWallpaper);

  const [files, setFiles] = useState(INITIAL_FILES);
  const [windows, setWindows] = useState<any[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<number | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(storeWallpaper || DEFAULT_WALLPAPER);
  const [contextMenu, setContextMenu] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(getTime());
  const [storageFiles, setStorageFiles] = useState<StorageFileRow[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [resolvedUserAvatar, setResolvedUserAvatar] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme = user?.theme || 'light';
  const songs = storageFiles.filter((file) => file.file_type === 'song');
  const currentSong = songs[currentSongIndex] || null;

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(getTime()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.start-menu-area') && !(e.target as Element).closest('.taskbar-start-btn')) setStartMenuOpen(false);
      setContextMenu(null);
    };
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  useEffect(() => {
    const handleOpenApp = (event: Event) => {
      const customEvent = event as CustomEvent<{ appId?: string }>;
      if (customEvent.detail?.appId) {
        openApp(customEvent.detail.appId);
      }
    };

    window.addEventListener('nova:open-app', handleOpenApp);
    return () => window.removeEventListener('nova:open-app', handleOpenApp);
  }, [windows]);

  useEffect(() => {
    if (user && isSupabaseConfigured && user.id !== 'demo-user') {
      supabase.from('desktop_state')
        .select('id, wallpaper_url')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const selectedWallpaper = data?.[0]?.wallpaper_url || DEFAULT_WALLPAPER;
          setWallpaper(selectedWallpaper);
          setStoreWallpaper(selectedWallpaper);
        });
    }
  }, [user, setStoreWallpaper]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || user.id === 'demo-user') {
      setStorageFiles([]);
      return;
    }

    const loadStorageFiles = async () => {
      const { data } = await supabase
        .from('storage_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const hydratedFiles = await Promise.all(
        ((data || []) as StorageFileRow[]).map(async (file) => ({
          ...file,
          preview_url: file.file_type === 'photo' ? await resolveRenderableUrl(file.file_url) : file.preview_url,
        }))
      );

      setStorageFiles(hydratedFiles);
    };

    loadStorageFiles();

    const channel = supabase
      .channel(`storage-files-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_files', filter: `user_id=eq.${user.id}` }, loadStorageFiles)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.avatar_url) {
      setResolvedUserAvatar('');
      return;
    }

    resolveRenderableUrl(user.avatar_url).then(setResolvedUserAvatar);
  }, [user?.avatar_url]);

  useEffect(() => {
    if (!songs.length) {
      setCurrentSongIndex(0);
      setIsAudioPlaying(false);
      return;
    }

    if (currentSongIndex > songs.length - 1) {
      setCurrentSongIndex(0);
    }
  }, [songs.length, currentSongIndex]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = audioVolume;
  }, [audioVolume]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    if (currentSong && isAudioPlaying) {
      audioRef.current.play().catch(() => undefined);
    } else {
      audioRef.current.pause();
    }
  }, [currentSong?.id, isAudioPlaying]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || user.id === 'demo-user') {
      return;
    }

    const userId = user.id;

    const touchProfile = () => {
      const last_active_at = new Date().toISOString();
      supabase.from('profiles').update({ last_active_at }).eq('id', userId);

      const currentUser = useUserStore.getState().user;
      if (currentUser?.id === userId) {
        setUser({ ...currentUser, last_active_at });
      }
    };

    touchProfile();
    const interval = setInterval(touchProfile, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, setUser]);

  const handleSetWallpaper = async (url: string) => {
    setWallpaper(url);
    setStoreWallpaper(url);
    if (user && isSupabaseConfigured && user.id !== 'demo-user') {
      const { data: existingRows } = await supabase.from('desktop_state')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      const existing = existingRows?.[0];

      if (existing?.id) {
        await supabase
          .from('desktop_state')
          .update({ wallpaper_url: url, theme: user.theme || 'light', icon_positions: [] })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('desktop_state')
          .insert({ user_id: user.id, wallpaper_url: url, theme: user.theme || 'light', icon_positions: [] });
      }
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    clearUser();
    setWindows([]);
    setActiveWindowId(null);
  };

  const handleSaveProfile = async (updates: Partial<OSUser>) => {
    if (!user || !isSupabaseConfigured || user.id === 'demo-user') {
      setUser({ ...user!, ...updates });
      return;
    }

    const nextUser = { ...user, ...updates };
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: nextUser.avatar_url,
        bio: nextUser.bio || '',
        status_text: nextUser.status_text || '',
        last_active_at: new Date().toISOString(),
        theme: nextUser.theme || 'light',
      })
      .eq('id', user.id);

    if (!error) {
      setUser(nextUser);
      if (nextUser.theme && user.id !== 'demo-user') {
        await supabase.from('desktop_state').update({ theme: nextUser.theme }).eq('user_id', user.id);
      }
    }
  };

  const playSongAtIndex = (index: number) => {
    if (!songs.length) {
      return;
    }

    setCurrentSongIndex(index);
    setIsPlayerVisible(true);
    setIsAudioPlaying(true);
  };

  const playSong = (song: StorageFileRow) => {
    const songIndex = songs.findIndex((entry) => entry.id === song.id);
    if (songIndex >= 0) {
      playSongAtIndex(songIndex);
    }
  };

  const handleNextSong = () => {
    if (!songs.length) {
      return;
    }

    playSongAtIndex((currentSongIndex + 1) % songs.length);
  };

  const handlePreviousSong = () => {
    if (!songs.length) {
      return;
    }

    playSongAtIndex((currentSongIndex - 1 + songs.length) % songs.length);
  };

  const openStorageFile = (file: StorageFileRow) => {
    if (file.file_type === 'song') {
      playSong(file);
      openApp('musicplayer');
      return;
    }

    openApp('photoviewer', file);
  };

  const openExplorerAt = (path: string) => {
    const newId = Date.now();
    const maxZ = Math.max(...windows.map((windowItem) => windowItem.zIndex), 0);
    playUISound(620, 0.05, 'triangle');
    setWindows([...windows, {
      id: newId,
      appId: 'explorer',
      title: 'File Explorer',
      file: null,
      isMinimized: false,
      isMaximized: false,
      zIndex: maxZ + 1,
      pos: { x: 80 + (windows.length * 25) % 200, y: 40 + (windows.length * 25) % 150 },
      size: { w: 800, h: 550 },
      path,
    }]);
    setActiveWindowId(newId);
  };

  const openApp = (appId: string, file: any = null) => {
    setStartMenuOpen(false);
    const existing = windows.find(w => w.appId === appId && !file);
    if (existing && !file && appId !== 'explorer') { focusWindow(existing.id); return; }

    const titles: Record<string, string> = {
      explorer: 'File Explorer', chrome: 'Nova Browser', word: file ? file.name : 'Word',
      terminal: 'Terminal', settings: 'Settings', minesweeper: 'Minesweeper',
      messenger: 'Messenger', friends: 'Friends', notifications: 'Notifications',
      mediaplayer: 'Media Player', musicplayer: 'Music Player', misacatch: "Misa's Catch", notepad: 'Nova Notes',
      filemanager: 'File Manager', recyclebin: 'Recycle Bin', social: 'Nova Feed', arcade: 'Arcade', photoviewer: 'Photo Viewer', calc: 'Calculator', paint: 'Paint'
    };

    const newId = Date.now();
    const maxZ = Math.max(...windows.map((windowItem) => windowItem.zIndex), 0);
    playUISound(620, 0.05, 'triangle');
    setWindows([...windows, {
      id: newId, appId, title: titles[appId] || 'Window', file,
      isMinimized: false, isMaximized: false,
      zIndex: maxZ + 1,
      pos: { x: 80 + (windows.length * 25) % 200, y: 40 + (windows.length * 25) % 150 },
      size: { w: 800, h: 550 }, path: 'root'
    }]);
    setActiveWindowId(newId);
  };

  const closeWindow = (id: number) => {
    playUISound(280, 0.09, 'sawtooth');
    setWindows(w => w.filter(x => x.id !== id));
  };
  const focusWindow = (id: number) => {
    setActiveWindowId(id);
    setWindows(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w);
    });
  };
  const toggleMinimize = (id: number) => {
    playUISound(350, 0.07, 'square');
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };
  const toggleMaximize = (id: number) => { playUISound(520, 0.07, 'triangle'); setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)); focusWindow(id); };
  const updateWindowSize = (id: number, size: any, pos?: any) => setWindows(prev => prev.map(w => w.id === id ? { ...w, size, pos: pos || w.pos } : w));

  const createNewFile = (type: string) => {
    setFiles([...files, { id: Date.now().toString(), parentId: 'desktop', name: type === 'folder' ? 'New Folder' : 'New Text Document.txt', type: type === 'folder' ? 'folder' : 'txt', content: '' }]);
  };

  const renameLocalItem = (item: any) => {
    const nextName = window.prompt('Rename item', item.name);
    if (!nextName || !nextName.trim()) return;
    setFiles((current) => current.map((entry) => (entry.id === item.id ? { ...entry, name: nextName.trim() } : entry)));
    setContextMenu(null);
  };

  const deleteLocalItem = (item: any) => {
    const idsToDelete = new Set<string>([item.id]);
    const collectChildren = (parentId: string) => {
      files.forEach((entry) => {
        if (entry.parentId === parentId) {
          idsToDelete.add(entry.id);
          if (entry.type === 'folder') collectChildren(entry.id);
        }
      });
    };
    if (item.type === 'folder') collectChildren(item.id);
    setFiles((current) => current.filter((entry) => !idsToDelete.has(entry.id)));
    setContextMenu(null);
  };

  const handleDesktopRightClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-desktop-icon]') || (e.target as Element).closest('[data-window-root]')) {
      return;
    }
    e.preventDefault();
    setContextMenu({ kind: 'desktop', x: e.clientX, y: e.clientY });
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: any, source: 'desktop' | 'explorer' = 'desktop') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ kind: 'item', source, x: e.clientX, y: e.clientY, item });
  };

  // Not logged in -> show lock screen
  if (!user) {
    return <LockScreen wallpaper={wallpaper} onUnlock={(u) => setUser(u)} />;
  }

  const taskbarApps = ['explorer', 'chrome', 'social', 'messenger', 'musicplayer', 'friends', 'notifications', 'filemanager', 'recyclebin'];

  return (
      <div className={`h-screen w-screen overflow-hidden relative select-none font-sans text-sm ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : ''}`}
      style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      onContextMenu={handleDesktopRightClick}>

      <audio
        ref={audioRef}
        src={currentSong?.file_url || ''}
        onEnded={handleNextSong}
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        className="hidden"
      />

      {/* Desktop Icons */}
      <div className="absolute top-0 left-0 h-[calc(100%-48px)] w-full p-2 flex flex-col flex-wrap content-start gap-1">
        <DesktopIcon icon={Monitor} label="This PC" onDblClick={() => openApp('explorer')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-blue-200" />
        <DesktopIcon icon={ArchiveRestore} label="Recycle Bin" onDblClick={() => openApp('recyclebin')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-gray-200" />
        <DesktopIcon icon={Chrome} label="Nova Browser" onDblClick={() => openApp('chrome')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-yellow-400" />
        <DesktopIcon icon={Newspaper} label="Nova Feed" onDblClick={() => openApp('social')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-pink-300" />
        <DesktopIcon icon={MessageCircle} label="Messenger" onDblClick={() => openApp('messenger')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-sky-300" />
        <DesktopIcon icon={Users} label="Friends" onDblClick={() => openApp('friends')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-amber-300" />
        <DesktopIcon icon={Bell} label="Notifications" onDblClick={() => openApp('notifications')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-yellow-300" />
        <DesktopIcon icon={Upload} label="Files" onDblClick={() => openApp('filemanager')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-teal-300" />
        <DesktopIcon icon={Music4} label="Music Player" onDblClick={() => openApp('musicplayer')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-cyan-300" />
        <DesktopIcon icon={Gamepad2} label="Arcade" onDblClick={() => openApp('arcade')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-fuchsia-300" />
        <DesktopIcon icon={Cat} label="Misa's Catch" onDblClick={() => openApp('misacatch')} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} color="text-orange-300" />
        {files.filter(f => f.parentId === 'desktop').map(file => (
          <DesktopIcon key={file.id} icon={file.type === 'folder' ? Folder : FileText} label={file.name}
            onDblClick={() => file.type === 'folder' ? openExplorerAt(file.id) : openApp('word', file)}
            onContextMenu={(e: React.MouseEvent) => handleItemContextMenu(e, file, 'desktop')}
            color={file.type === 'folder' ? 'text-yellow-400' : 'text-white'} />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu?.kind === 'desktop' && (
        <div className={`absolute backdrop-blur-lg rounded-lg shadow-xl py-1 w-52 z-[9999] ${theme === 'dark' ? 'bg-slate-900/95 border border-white/10' : 'bg-white/95 border border-gray-200'}`} style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}><Maximize2 size={14}/> View</div>
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}><Grid size={14}/> Sort by</div>
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => window.location.reload()}><RotateCw size={14}/> Refresh</div>
          <div className={`h-px my-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => createNewFile('folder')}><Folder size={14}/> New Folder</div>
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => createNewFile('txt')}><FileText size={14}/> New Text Document</div>
          <div className={`h-px my-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => openApp('settings')}><Settings size={14}/> Personalize</div>
        </div>
      )}

      {contextMenu?.kind === 'item' && (
        <div className={`absolute backdrop-blur-lg rounded-lg shadow-xl py-1 w-44 z-[9999] ${theme === 'dark' ? 'bg-slate-900/95 border border-white/10' : 'bg-white/95 border border-gray-200'}`} style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => {
            const item = contextMenu.item;
            if (item.file_url) openStorageFile(item);
            else if (item.type === 'folder') openExplorerAt(item.id);
            else openApp(item.type === 'txt' || item.type === 'code' ? 'word' : 'paint', item);
            setContextMenu(null);
          }}><Maximize2 size={14}/> Open</div>
          {!contextMenu.item.file_url && (
            <div className={`px-4 py-1.5 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => renameLocalItem(contextMenu.item)}><Type size={14}/> Rename</div>
          )}
          {!contextMenu.item.file_url && (
            <div className={`px-4 py-1.5 hover:bg-red-500 hover:text-white cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`} onClick={() => deleteLocalItem(contextMenu.item)}><Trash2 size={14}/> Delete</div>
          )}
        </div>
      )}

      {/* Windows */}
      {windows.map(win => (
        <DraggableWindow key={win.id} win={win} isActive={activeWindowId === win.id}
          theme={theme}
          onFocus={() => focusWindow(win.id)} onClose={() => closeWindow(win.id)}
          onMinimize={() => toggleMinimize(win.id)} onMaximize={() => toggleMaximize(win.id)}
          onResize={(s: any, p: any) => updateWindowSize(win.id, s, p)}>
          {win.appId === 'explorer' && <AppExplorer files={files} storageFiles={storageFiles} theme={theme} currentPath={win.path}
            onNavigate={(p: string) => setWindows(prev => prev.map(w => w.id === win.id ? { ...w, path: p } : w))}
            onOpenFile={(f: any) => openApp(f.type === 'txt' || f.type === 'code' ? 'word' : 'paint', f)}
            onOpenStorageFile={openStorageFile}
            onItemContextMenu={(event: React.MouseEvent, item: any) => handleItemContextMenu(event, item, 'explorer')} />}
          {win.appId === 'chrome' && <AppChrome />}
          {win.appId === 'social' && <Win11SocialFeed />}
          {win.appId === 'word' && <AppWord file={win.file} onSave={(content: string) => {
            if (win.file) setFiles(prev => prev.map(f => f.id === win.file.id ? { ...f, content } : f));
            else setFiles([...files, { id: Date.now().toString(), parentId: 'docs', name: 'Untitled.txt', type: 'txt', content }]);
          }} />}
          {win.appId === 'terminal' && <AppTerminal />}
          {win.appId === 'settings' && <AppSettings currentWallpaper={wallpaper} onSetWallpaper={handleSetWallpaper} user={user} onLogout={handleLogout} onSaveProfile={handleSaveProfile} theme={theme} resolvedAvatarUrl={resolvedUserAvatar} />}
          {win.appId === 'minesweeper' && <Minesweeper />}
          {win.appId === 'calc' && <AppCalculator />}
          {win.appId === 'messenger' && <Win11Messenger />}
          {win.appId === 'friends' && <Win11Friends />}
          {win.appId === 'notifications' && <Win11Notifications />}
          {win.appId === 'mediaplayer' && <Win11MediaPlayer />}
          {win.appId === 'musicplayer' && <Win11MusicPlayer songs={songs} currentSong={currentSong} isPlaying={isAudioPlaying} volume={audioVolume} onSelectSong={playSong} onTogglePlay={() => setIsAudioPlaying((value) => !value)} onSetVolume={setAudioVolume} onNext={handleNextSong} />}
          {win.appId === 'misacatch' && <Win11MisaCatch />}
          {win.appId === 'notepad' && <Win11TextEditor />}
          {win.appId === 'filemanager' && <Win11FileManager />}
          {win.appId === 'recyclebin' && <Win11RecycleBin />}
          {win.appId === 'arcade' && <Win11Arcade />}
          {win.appId === 'photoviewer' && <AppPhotoViewer file={win.file} theme={theme} />}
          {win.appId === 'paint' && <div className="flex items-center justify-center h-full bg-white text-gray-400"><Palette size={48} className="mr-3" /> Paint — Coming Soon</div>}
        </DraggableWindow>
      ))}

      {/* Start Menu */}
      <div className="start-menu-area">
        <StartMenu isOpen={startMenuOpen} onOpenApp={openApp} onOpenFile={(file: any) => openApp(file.type === 'folder' ? 'explorer' : 'word', file)} apps={ICONS} files={files} user={user} onLogout={handleLogout} theme={theme} />
      </div>

      {currentSong && (
        <div className="absolute right-5 top-5 z-[10001] group">
          <div className={`overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 ${theme === 'dark' ? 'border-white/10 bg-slate-900/88' : 'border-white/70 bg-white/88'} backdrop-blur-xl ${isPlayerVisible ? 'w-[320px]' : 'w-[220px]'}`}>
            <button
              onMouseEnter={() => setIsPlayerVisible(true)}
              onMouseLeave={() => setIsPlayerVisible(false)}
              onClick={() => openApp('musicplayer')}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-400">
                <Music4 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{currentSong.filename}</div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{isAudioPlaying ? 'Playing now' : 'Paused'}</div>
              </div>
            </button>
            <div className={`max-h-0 overflow-hidden px-4 transition-all duration-300 group-hover:max-h-40 ${isPlayerVisible ? 'pb-4' : ''}`}>
              <div className="flex items-center gap-2">
                <button onClick={handlePreviousSong} className="rounded-2xl bg-white/10 p-2 hover:bg-white/15"><SkipBack size={16} /></button>
                <button onClick={() => setIsAudioPlaying((value) => !value)} className="rounded-2xl bg-cyan-400 p-2 text-slate-950 hover:bg-cyan-300">
                  {isAudioPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={handleNextSong} className="rounded-2xl bg-white/10 p-2 hover:bg-white/15"><SkipForward size={16} /></button>
                <div className="flex flex-1 items-center gap-2 pl-2">
                  <Volume2 size={14} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
                  <input type="range" min="0" max="1" step="0.01" value={audioVolume} onChange={(event) => setAudioVolume(Number(event.target.value))} className="w-full accent-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className={`absolute bottom-0 w-full h-12 backdrop-blur-xl border-t flex items-center justify-between px-4 z-[10000] ${
        theme === 'dark' ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white/85 border-white/50'
      }`}>
        <div className="flex-1 invisible sm:visible">
          <div className="flex items-center gap-2 hover:bg-white/50 px-2 py-1 rounded cursor-pointer w-fit">
            <div className="text-xs font-medium text-gray-700">24°C Mostly Sunny</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className={`p-2 rounded hover:bg-white/60 transition-all active:scale-95 taskbar-start-btn ${startMenuOpen ? 'bg-white/60' : ''}`}
            onClick={() => setStartMenuOpen(!startMenuOpen)}>
            <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
              <div className="bg-blue-500 rounded-sm" /><div className="bg-blue-500 rounded-sm" />
              <div className="bg-blue-500 rounded-sm" /><div className="bg-blue-500 rounded-sm" />
            </div>
          </button>
          <div className="w-px h-6 bg-gray-400/30 mx-1" />
          {taskbarApps.map(appId => {
            const AppIcon = ICONS[appId]?.icon;
            if (!AppIcon) return null;
            const isOpen = windows.some(w => w.appId === appId);
            return (
              <button key={appId} onClick={() => {
                const existing = windows.find(w => w.appId === appId);
                if (existing) { if (existing.isMinimized) focusWindow(existing.id); else if (activeWindowId === existing.id) toggleMinimize(existing.id); else focusWindow(existing.id); }
                else openApp(appId);
              }} className={`p-2 rounded hover:bg-white/60 relative group ${isOpen ? 'bg-white/40' : ''}`}>
                <AppIcon size={20} className={`${ICONS[appId].color} transition-transform group-hover:-translate-y-0.5`} />
                {isOpen && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-blue-500 rounded-full" />}
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
          <div className="flex gap-2 px-2 hover:bg-white/60 py-1 rounded cursor-pointer text-gray-600">
            <Volume2 size={16} /> <Battery size={16} />
          </div>
          <div className="text-right text-xs hover:bg-white/60 px-2 py-1 rounded cursor-pointer text-gray-700">
            <div className="font-medium">{currentTime}</div>
            <div className="text-[10px] text-gray-500">{getDate()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
