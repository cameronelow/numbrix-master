import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RefreshCw, 
  HelpCircle, 
  Settings, 
  Timer, 
  ChevronRight, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Grid } from './components/Grid';
import { 
  createPuzzle, 
  checkWin, 
  GRID_SIZE, 
  TOTAL_CELLS, 
  type Grid as GridType, 
  type Cell 
} from './utils/numbrix';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Difficulty = 'easy' | 'medium' | 'hard';

export default function App() {
  const [grid, setGrid] = useState<GridType | null>(null);
  const [solution, setSolution] = useState<number[][] | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isWinning, setIsWinning] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);

  const startNewGame = useCallback((diff: Difficulty = difficulty) => {
    setIsGenerating(true);
    setIsActive(false);
    setIsWinning(false);
    setTime(0);
    setHint(null);
    
    // Use a timeout to allow UI to show loading state
    setTimeout(() => {
      try {
        const { puzzle, solution: sol } = createPuzzle(diff);
        setGrid(puzzle);
        setSolution(sol);
        setDifficulty(diff);
        setIsActive(true);
      } catch (error) {
        console.error("Failed to generate puzzle:", error);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  }, [difficulty]);

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isWinning) {
      interval = setInterval(() => {
        setTime((time) => time + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isWinning]);

  const handleCellChange = (r: number, c: number, value: number | null) => {
    if (!grid || isWinning) return;
    
    const newGrid = [...grid.map(row => [...row])];
    newGrid[r][c].value = value;
    setGrid(newGrid);

    if (checkWin(newGrid)) {
      setIsWinning(true);
      setIsActive(false);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b']
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHint = async () => {
    if (!grid || isHintLoading || isWinning) return;

    // If a cell is selected, reveal its value
    if (selectedCell && solution) {
      const { r, c } = selectedCell;
      const correctValue = solution[r][c];
      
      if (grid[r][c].value === correctValue) {
        setHint("This cell is already correct!");
        return;
      }

      handleCellChange(r, c, correctValue);
      setHint(`Revealed: The value for this cell is ${correctValue}.`);
      return;
    }

    // Otherwise, get a general AI hint
    setIsHintLoading(true);
    setHint(null);

    try {
      const currentGridStr = grid.map(row => 
        row.map(cell => cell.value ?? '0').join(',')
      ).join('\n');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Current 6x6 Numbrix grid (0=empty):
        ${currentGridStr}
        
        Provide a 1-sentence hint for the next move. Be extremely fast and direct.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      setHint(response.text);
    } catch (error) {
      console.error("Hint error:", error);
      setHint("Select a cell to reveal its value, or try again for a general hint.");
    } finally {
      setIsHintLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="max-w-4xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight text-zinc-900 flex items-center gap-3"
          >
            <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Trophy className="w-8 h-8" />
            </span>
            Numbrix Master
          </motion.h1>
          <p className="text-zinc-500 font-medium italic">Connect the numbers 1 to 36</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-zinc-200">
            <Timer className="w-4 h-4 text-zinc-400" />
            <span className="font-mono font-bold text-zinc-700">{formatTime(time)}</span>
          </div>
          
          <div className="flex bg-zinc-200 p-1 rounded-xl">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => startNewGame(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  difficulty === d 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">
        <section className="space-y-8">
          <div className="relative">
            {isGenerating && (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="font-bold text-zinc-600">Generating Puzzle...</p>
                </div>
              </div>
            )}
            
            {grid && (
              <Grid 
                grid={grid} 
                onCellChange={handleCellChange}
                selectedCell={selectedCell}
                onSelectCell={(r, c) => setSelectedCell({ r, c })}
                isWinning={isWinning}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => startNewGame()}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-zinc-200"
            >
              <RefreshCw className="w-5 h-5" />
              Reset Puzzle
            </button>
            <button 
              onClick={getHint}
              disabled={isHintLoading || isWinning}
              className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-50 rounded-2xl font-bold hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 min-w-[180px] justify-center"
            >
              {isHintLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {selectedCell ? "Reveal Selected" : "Get AI Hint"}
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <AnimatePresence>
            {isWinning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-emerald-600 text-white p-6 rounded-3xl shadow-2xl shadow-emerald-200 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Victory!</h2>
                </div>
                <p className="text-emerald-50 font-medium">
                  You solved the {difficulty} puzzle in {formatTime(time)}!
                </p>
                <button 
                  onClick={() => startNewGame()}
                  className="w-full py-3 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all"
                >
                  Play Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
              How to Play
            </h3>
            <ul className="space-y-4 text-sm text-zinc-600 font-medium">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">1</span>
                Fill the 6x6 grid with numbers from 1 to 36.
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">2</span>
                Consecutive numbers must be adjacent (up, down, left, or right).
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">3</span>
                No diagonal moves allowed.
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">4</span>
                Use clues (bold numbers) to find the path.
              </li>
            </ul>
          </div>

          <AnimatePresence>
            {hint && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl space-y-3"
              >
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <Sparkles className="w-4 h-4" />
                  AI Hint
                </div>
                <p className="text-sm text-indigo-900 leading-relaxed italic">
                  "{hint}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-200 flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-400 text-sm font-medium">
        <p>© 2026 Numbrix Master. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-zinc-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-zinc-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-600 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
