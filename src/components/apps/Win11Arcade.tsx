import React, { useMemo, useState } from 'react';
import { Gamepad2 } from 'lucide-react';

const GAMES = [
  {
    id: 'catch',
    name: 'Sky Catch',
    description: 'Catch falling stars and beat your reflexes.',
  },
  {
    id: 'memory',
    name: 'Memory Flip',
    description: 'Find matching pairs in a cozy board.',
  },
  {
    id: 'dots',
    name: 'Neon Dots',
    description: 'Tap the moving target before it escapes.',
  },
];

export const Win11Arcade: React.FC = () => {
  const [activeGame, setActiveGame] = useState(GAMES[0]);
  const [memoryCards, setMemoryCards] = useState(() =>
    ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'].sort(() => Math.random() - 0.5).map((label, index) => ({
      id: `${label}-${index}`,
      label,
      open: false,
      matched: false,
    }))
  );
  const [memoryPick, setMemoryPick] = useState<string[]>([]);
  const [catchScore, setCatchScore] = useState(0);
  const [dotScore, setDotScore] = useState(0);
  const [dotPosition, setDotPosition] = useState({ top: 40, left: 50 });

  const matchedCount = useMemo(() => memoryCards.filter((card) => card.matched).length, [memoryCards]);

  const handleMemoryPick = (id: string) => {
    if (memoryPick.length === 2) {
      return;
    }

    const selected = memoryCards.find((card) => card.id === id);
    if (!selected || selected.open || selected.matched) {
      return;
    }

    const nextPick = [...memoryPick, id];
    const nextCards = memoryCards.map((card) => (card.id === id ? { ...card, open: true } : card));
    setMemoryCards(nextCards);
    setMemoryPick(nextPick);

    if (nextPick.length === 2) {
      const [firstId, secondId] = nextPick;
      const first = nextCards.find((card) => card.id === firstId);
      const second = nextCards.find((card) => card.id === secondId);

      window.setTimeout(() => {
        setMemoryCards((current) =>
          current.map((card) => {
            if (card.id !== firstId && card.id !== secondId) {
              return card;
            }

            if (first?.label === second?.label) {
              return { ...card, matched: true, open: true };
            }

            return { ...card, open: false };
          })
        );
        setMemoryPick([]);
      }, 500);
    }
  };

  const moveDot = () => {
    setDotScore((score) => score + 1);
    setDotPosition({
      top: Math.floor(Math.random() * 75) + 5,
      left: Math.floor(Math.random() * 75) + 5,
    });
  };

  return (
    <div className="flex h-full bg-[#0f1220] text-white">
      <div className="w-64 border-r border-white/10 bg-black/20 p-4">
        <div className="mb-4 text-sm font-semibold">Arcade</div>
        <div className="space-y-2">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game)}
              className={`w-full rounded-xl p-3 text-left transition-colors ${
                activeGame.id === game.id ? 'bg-cyan-500/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{game.name}</div>
              <div className="mt-1 text-xs text-white/60">{game.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{activeGame.name}</div>
            <div className="text-[11px] text-white/60">{activeGame.description}</div>
          </div>
        </div>

        <div className="relative flex-1 p-6">
          {activeGame.id === 'catch' && (
            <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#0b1220_65%)] p-6">
              <div className="mb-4 text-sm text-white/70">Click the star as many times as you can.</div>
              <div className="mb-4 text-3xl font-black">{catchScore}</div>
              <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                <button
                  onClick={() => setCatchScore((score) => score + 1)}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl transition-transform hover:scale-110"
                >
                  ⭐
                </button>
              </div>
            </div>
          )}

          {activeGame.id === 'memory' && (
            <div className="h-full rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#3b0764,#111827)] p-6">
              <div className="mb-4 text-sm text-white/70">Matched pairs: {matchedCount / 2} / 4</div>
              <div className="grid grid-cols-4 gap-4">
                {memoryCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleMemoryPick(card.id)}
                    className={`aspect-square rounded-3xl text-2xl font-black transition-all ${
                      card.open || card.matched ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    {card.open || card.matched ? card.label : '?'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeGame.id === 'dots' && (
            <div className="h-full rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#0f766e,#111827_70%)] p-6">
              <div className="mb-4 text-sm text-white/70">Score: {dotScore}</div>
              <div className="relative h-[calc(100%-32px)] overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                <button
                  onClick={moveDot}
                  className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_40px_rgba(34,211,238,0.45)] transition-all"
                  style={{ top: `${dotPosition.top}%`, left: `${dotPosition.left}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
