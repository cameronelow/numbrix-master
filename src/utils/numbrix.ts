export type Cell = {
  value: number | null;
  isClue: boolean;
  row: number;
  col: number;
};

export type Grid = Cell[][];

export const GRID_SIZE = 6;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

export function createEmptyGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({ value: null, isClue: false, row: r, col: c });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Generates a full Numbrix path using backtracking with a heuristic.
 * Uses a Warnsdorff-like heuristic: prioritize moving to cells with fewer available neighbors.
 */
export function generateFullSolution(): number[][] | null {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  function isValid(r: number, c: number) {
    return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c] === 0;
  }

  function countNeighbors(r: number, c: number) {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (isValid(r + dr[i], c + dc[i])) count++;
    }
    return count;
  }

  function solve(r: number, c: number, count: number): boolean {
    grid[r][c] = count;
    if (count === TOTAL_CELLS) return true;

    // Heuristic: Find neighbors and sort them by their own neighbor count
    const neighbors: { r: number; c: number; n: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const nr = r + dr[i];
      const nc = c + dc[i];
      if (isValid(nr, nc)) {
        neighbors.push({ r: nr, c: nc, n: countNeighbors(nr, nc) });
      }
    }

    // Sort by fewest neighbors (Warnsdorff's Rule)
    // Add a tiny bit of randomness to get different puzzles
    neighbors.sort((a, b) => (a.n - b.n) || (Math.random() - 0.5));

    for (const next of neighbors) {
      if (solve(next.r, next.c, count + 1)) return true;
    }

    grid[r][c] = 0;
    return false;
  }

  // Try a few times with different starting positions if needed
  for (let attempt = 0; attempt < 10; attempt++) {
    const startR = Math.floor(Math.random() * GRID_SIZE);
    const startC = Math.floor(Math.random() * GRID_SIZE);
    if (solve(startR, startC, 1)) return grid;
    
    // Reset grid for next attempt
    for (let r = 0; r < GRID_SIZE; r++) grid[r].fill(0);
  }

  return null;
}

/**
 * Creates a puzzle by hiding some numbers from the solution.
 * Difficulty determines how many clues are kept.
 */
export function createPuzzle(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): { puzzle: Grid; solution: number[][] } {
  const solution = generateFullSolution();
  if (!solution) throw new Error("Failed to generate solution");

  const grid = createEmptyGrid();
  
  // Clue count based on difficulty
  // Easy: ~12 clues, Medium: ~8 clues, Hard: ~5 clues
  let clueCount = 8;
  if (difficulty === 'easy') clueCount = 14;
  if (difficulty === 'hard') clueCount = 5;

  // Always include 1 and 81
  const clues = new Set<number>([1, TOTAL_CELLS]);
  
  // Pick random numbers to be clues
  const allNumbers = Array.from({ length: TOTAL_CELLS - 2 }, (_, i) => i + 2);
  allNumbers.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < clueCount - 2; i++) {
    clues.add(allNumbers[i]);
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = solution[r][c];
      if (clues.has(val)) {
        grid[r][c].value = val;
        grid[r][c].isClue = true;
      }
    }
  }

  return { puzzle: grid, solution };
}

export function checkWin(grid: Grid): boolean {
  // 1. Check if all cells are filled
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].value === null) return false;
    }
  }

  // 2. Check if all numbers 1-81 are present exactly once
  const seen = new Set<number>();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c].value!;
      if (val < 1 || val > TOTAL_CELLS || seen.has(val)) return false;
      seen.add(val);
    }
  }

  // 3. Check adjacency
  const posMap = new Map<number, { r: number; c: number }>();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      posMap.set(grid[r][c].value!, { r, c });
    }
  }

  for (let i = 1; i < TOTAL_CELLS; i++) {
    const p1 = posMap.get(i)!;
    const p2 = posMap.get(i + 1)!;
    const dist = Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
    if (dist !== 1) return false;
  }

  return true;
}
