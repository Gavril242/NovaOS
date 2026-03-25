import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

interface FallingObject {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  color: string;
}

export const Win11MisaCatch: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 500 });

  const gs = useRef({
    cat: { x: 175, y: 350, width: 50, height: 50 },
    objects: [] as FallingObject[],
    score: 0,
    gameRunning: false,
    lastSpawn: 0,
    spawnInterval: 900,
    speedMultiplier: 1,
  });

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setCanvasSize({ w: Math.min(r.width - 32, 500), h: Math.min(r.height - 32, 600) });
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [gameStarted]);

  useEffect(() => {
    if (user && isSupabaseConfigured) {
      supabase.from('profiles').select('high_score').eq('id', user.id).single()
        .then(({ data }) => setHighScore(data?.high_score || 0));
    }
  }, [user]);

  useEffect(() => {
    if (!gameStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gs.current;
    g.gameRunning = true;
    g.cat.y = canvas.height - 60;

    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      g.cat.x = Math.max(0, Math.min(e.clientX - r.left - 25, canvas.width - 50));
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      g.cat.x = Math.max(0, Math.min(e.touches[0].clientX - r.left - 25, canvas.width - 50));
    };

    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('touchmove', onTouch, { passive: false });

    let animId: number;
    const loop = () => {
      if (!g.gameRunning) return;
      const cw = canvas.width, ch = canvas.height;

      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, cw, ch);

      // Grid
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      for (let x = 0; x < cw; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke(); }

      // Spawn
      const now = Date.now();
      if (now - g.lastSpawn > g.spawnInterval) {
        g.objects.push({
          x: Math.random() * (cw - 28), y: -28, width: 28, height: 28,
          vy: (2 + Math.random() * 1.5) * g.speedMultiplier,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
        g.lastSpawn = now;
      }

      if (g.score > 0 && g.score % 50 === 0) {
        g.speedMultiplier = 1 + g.score / 200;
        g.spawnInterval = Math.max(400, 900 - g.score * 2);
      }

      let lost = false;
      g.objects = g.objects.filter(o => { if (o.y > ch + 10) { lost = true; return false; } return true; });
      g.objects.forEach(o => { o.y += o.vy; });

      g.objects = g.objects.filter(o => {
        if (o.x < g.cat.x + 50 && o.x + 28 > g.cat.x && o.y < g.cat.y + 50 && o.y + 28 > g.cat.y) {
          g.score += 10; setScore(g.score); return false;
        }
        return true;
      });

      // Cat
      const cx = g.cat.x, cy = g.cat.y;
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.roundRect(cx, cy, 50, 50, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx + 17, cy + 22, 4, 0, Math.PI * 2); ctx.arc(cx + 33, cy + 22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(cx + 17, cy + 22, 2, 0, Math.PI * 2); ctx.arc(cx + 33, cy + 22, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.moveTo(cx + 5, cy + 4); ctx.lineTo(cx - 2, cy - 12); ctx.lineTo(cx + 16, cy + 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 45, cy + 4); ctx.lineTo(cx + 52, cy - 12); ctx.lineTo(cx + 34, cy + 2); ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath(); ctx.arc(cx + 25, cy + 30, 3, 0, Math.PI * 2); ctx.fill();

      // Objects
      g.objects.forEach(o => {
        ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.roundRect(o.x, o.y, 28, 28, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('★', o.x + 14, o.y + 19);
      });

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(8, 8, 120, 32, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`Score: ${g.score}`, 18, 30);

      if (lost) {
        g.gameRunning = false; setGameOver(true);
        if (g.score > highScore && user && isSupabaseConfigured) {
          supabase.from('profiles').update({ high_score: g.score }).eq('id', user.id);
          setHighScore(g.score);
          setUser({ ...user, high_score: g.score });
        }
        return;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => { g.gameRunning = false; cancelAnimationFrame(animId); canvas.removeEventListener('mousemove', onMouse); canvas.removeEventListener('touchmove', onTouch); };
  }, [gameStarted, canvasSize]);

  const startGame = () => {
    const g = gs.current;
    g.score = 0; g.objects = []; g.lastSpawn = 0; g.spawnInterval = 900; g.speedMultiplier = 1;
    setScore(0); setGameOver(false); setGameStarted(true);
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {!gameStarted ? (
        <div className="text-center bg-white rounded-xl shadow-lg p-8">
          <div className="text-5xl mb-4">🐱</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Misa's Catch</h1>
          <p className="text-gray-500 text-sm mb-1">Move to catch falling stars!</p>
          <p className="text-yellow-500 text-sm mb-6 font-medium">🏆 High Score: {highScore}</p>
          <button onClick={startGame} className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
            Start Game
          </button>
        </div>
      ) : gameOver ? (
        <div className="text-center bg-white rounded-xl shadow-lg p-8">
          <div className="text-5xl mb-4">😿</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Game Over!</h1>
          <p className="text-3xl text-blue-500 font-bold mb-1">{score}</p>
          <p className="text-gray-500 text-sm mb-6">{score > highScore ? '🎉 New High Score!' : `Best: ${highScore}`}</p>
          <button onClick={startGame} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors">
            Play Again
          </button>
        </div>
      ) : (
        <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
          className="rounded-xl shadow-lg touch-none" style={{ maxWidth: '100%', maxHeight: '100%' }} />
      )}
    </div>
  );
};
