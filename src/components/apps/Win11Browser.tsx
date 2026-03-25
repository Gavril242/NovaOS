import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Home,
  RotateCw,
  Search,
  Tv,
} from 'lucide-react';

import { extractYouTubeVideoId, looksLikeUrl, normalizeUrl } from '@/lib/novaos';

type BrowserView =
  | { type: 'home' }
  | { type: 'youtube'; url: string; label: string }
  | { type: 'web'; url: string; label: string }
  | { type: 'search'; query: string };

const QUICK_LINKS = [
  { label: 'YouTube', value: 'https://www.youtube.com' },
  { label: 'Supabase', value: 'https://supabase.com' },
  { label: 'Wikipedia', value: 'https://www.wikipedia.org' },
  { label: 'OpenAI', value: 'https://openai.com' },
];

const HOME_HINTS = [
  'Paste a YouTube link to watch inside NovaOS.',
  'Open embeddable websites in the browser frame.',
  'Use search mode to jump out to Google, DuckDuckGo, YouTube, or Wikipedia.',
];

const createView = (value: string): BrowserView => {
  const input = value.trim();

  if (!input) {
    return { type: 'home' };
  }

  const videoId = extractYouTubeVideoId(input);
  if (videoId) {
    return {
      type: 'youtube',
      url: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      label: 'YouTube',
    };
  }

  if (input.toLowerCase().includes('youtube')) {
    return {
      type: 'web',
      url: normalizeUrl(input),
      label: 'YouTube',
    };
  }

  if (looksLikeUrl(input)) {
    return {
      type: 'web',
      url: normalizeUrl(input),
      label: input,
    };
  }

  return {
    type: 'search',
    query: input,
  };
};

export const Win11Browser: React.FC = () => {
  const [history, setHistory] = useState<BrowserView[]>([{ type: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [input, setInput] = useState('');
  const [frameKey, setFrameKey] = useState(0);

  const currentView = history[historyIndex] || { type: 'home' };

  const displayValue = useMemo(() => {
    if (currentView.type === 'youtube' || currentView.type === 'web') {
      return currentView.url;
    }

    if (currentView.type === 'search') {
      return currentView.query;
    }

    return '';
  }, [currentView]);

  const navigate = (value: string) => {
    const nextView = createView(value);
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextView);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setInput('');
    setFrameKey((key) => key + 1);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(input || displayValue);
  };

  const goHome = () => {
    navigate('');
  };

  const openExternal = (value?: string) => {
    const target =
      value ||
      (currentView.type === 'youtube' || currentView.type === 'web'
        ? currentView.url
        : currentView.type === 'search'
          ? `https://duckduckgo.com/?q=${encodeURIComponent(currentView.query)}`
          : 'https://www.youtube.com');

    window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 bg-[#eef3f7] p-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-gray-500">
            <button
              onClick={() => setHistoryIndex((index) => Math.max(0, index - 1))}
              disabled={historyIndex === 0}
              className="rounded-md p-1.5 hover:bg-white disabled:opacity-40"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() =>
                setHistoryIndex((index) => Math.min(history.length - 1, index + 1))
              }
              disabled={historyIndex >= history.length - 1}
              className="rounded-md p-1.5 hover:bg-white disabled:opacity-40"
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => setFrameKey((key) => key + 1)}
              className="rounded-md p-1.5 hover:bg-white"
            >
              <RotateCw size={16} />
            </button>
            <button onClick={goHome} className="rounded-md p-1.5 hover:bg-white">
              <Home size={16} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 shadow-sm">
              <Search size={15} className="mr-2 text-gray-400" />
              <input
                value={input || displayValue}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Search or enter a YouTube link / URL"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </form>

          <button
            onClick={() => openExternal()}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={13} />
            Open
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {currentView.type === 'home' && (
          <div className="flex h-full flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_top,#fde68a_0%,#fff4dd_35%,#ffffff_75%)] px-6 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                Nova Browser
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-tight text-gray-900">
                Browse with Misa
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
                YouTube works directly in the webapp. Other sites open here when they allow
                embedding, and you can jump out to a real tab any time.
              </p>
            </div>

            <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
              {HOME_HINTS.map((hint) => (
                <div
                  key={hint}
                  className="rounded-2xl border border-amber-100 bg-white/80 p-4 text-left text-sm text-gray-700 shadow-sm"
                >
                  {hint}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.value)}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentView.type === 'youtube' && (
          <div className="flex h-full flex-col bg-[#0f0f10]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Tv size={16} className="text-red-400" />
                <span className="text-sm font-semibold">YouTube</span>
              </div>
              <button
                onClick={() => openExternal(currentView.url.replace('/embed/', '/watch?v='))}
                className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
              >
                Open on YouTube
              </button>
            </div>
            <iframe
              key={frameKey}
              src={currentView.url}
              title="YouTube"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {currentView.type === 'web' && (
          <div className="relative h-full bg-gray-100">
            <iframe
              key={frameKey}
              src={currentView.url}
              title={currentView.label}
              className="h-full w-full bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl bg-black/70 px-3 py-2 text-[11px] text-white shadow-lg">
              Some sites block embedding. If the page looks blank, use Open.
            </div>
          </div>
        )}

        {currentView.type === 'search' && (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef7ff_35%,#ffffff_80%)] p-6">
            <div className="w-full max-w-2xl rounded-[28px] border border-blue-100 bg-white/90 p-8 shadow-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Search the web</h2>
                  <p className="text-sm text-gray-500">"{currentView.query}"</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() =>
                    openExternal(`https://duckduckgo.com/?q=${encodeURIComponent(currentView.query)}`)
                  }
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900">DuckDuckGo</p>
                  <p className="mt-1 text-xs text-gray-500">Fast web search in a new tab.</p>
                </button>

                <button
                  onClick={() =>
                    openExternal(`https://www.google.com/search?q=${encodeURIComponent(currentView.query)}`)
                  }
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900">Google</p>
                  <p className="mt-1 text-xs text-gray-500">Open Google results externally.</p>
                </button>

                <button
                  onClick={() =>
                    openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(currentView.query)}`)
                  }
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900">YouTube</p>
                  <p className="mt-1 text-xs text-gray-500">Find videos and paste one back in.</p>
                </button>

                <button
                  onClick={() =>
                    openExternal(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(currentView.query)}`)
                  }
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900">Wikipedia</p>
                  <p className="mt-1 text-xs text-gray-500">Jump to knowledge-heavy results.</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
