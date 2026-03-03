import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GRID_SIZE, TOTAL_CELLS, type Grid as GridType, type Cell } from '../utils/numbrix';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GridProps {
  grid: GridType;
  onCellChange: (row: number, col: number, value: number | null) => void;
  selectedCell: { r: number; c: number } | null;
  onSelectCell: (r: number, c: number) => void;
  isWinning: boolean;
}

export const Grid: React.FC<GridProps> = ({ grid, onCellChange, selectedCell, onSelectCell, isWinning }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );

  useEffect(() => {
    if (selectedCell) {
      inputRefs.current[selectedCell.r][selectedCell.c]?.focus();
    }
  }, [selectedCell]);

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === 'ArrowUp' && r > 0) onSelectCell(r - 1, c);
    if (e.key === 'ArrowDown' && r < GRID_SIZE - 1) onSelectCell(r + 1, c);
    if (e.key === 'ArrowLeft' && c > 0) onSelectCell(r, c - 1);
    if (e.key === 'ArrowRight' && c < GRID_SIZE - 1) onSelectCell(r, c + 1);
    if (e.key === 'Backspace' && !grid[r][c].isClue) {
      onCellChange(r, c, null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, r: number, c: number) => {
    if (grid[r][c].isClue) return;
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      onCellChange(r, c, null);
    } else if (val >= 1 && val <= TOTAL_CELLS) {
      onCellChange(r, c, val);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-1 bg-zinc-200 p-1 rounded-lg shadow-inner w-full max-w-md mx-auto aspect-square">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = selectedCell?.r === r && selectedCell?.c === c;
          const isClue = cell.isClue;
          
          return (
            <motion.div
              key={`${r}-${c}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (r * GRID_SIZE + c) * 0.005 }}
              className={cn(
                "relative flex items-center justify-center bg-white rounded-sm transition-all duration-200",
                isSelected && "ring-2 ring-indigo-500 z-10",
                isClue ? "bg-zinc-100 text-zinc-900 font-bold" : "text-indigo-600",
                isWinning && "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
              onClick={() => onSelectCell(r, c)}
            >
              <input
                ref={(el) => (inputRefs.current[r][c] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={cell.value ?? ''}
                onChange={(e) => handleChange(e, r, c)}
                onKeyDown={(e) => handleKeyDown(e, r, c)}
                readOnly={isClue || isWinning}
                className={cn(
                  "w-full h-full text-center text-lg sm:text-xl font-mono bg-transparent outline-none cursor-pointer",
                  isClue && "cursor-default"
                )}
              />
              {/* Adjacency indicators could go here */}
            </motion.div>
          );
        })
      )}
    </div>
  );
};
