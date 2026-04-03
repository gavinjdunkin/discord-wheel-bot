import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gamesFilePath = join(__dirname, 'games.json');

export function loadGames() {
  if (!existsSync(gamesFilePath)) return [];
  try {
    return JSON.parse(readFileSync(gamesFilePath, 'utf8'));
  } catch {
    return [];
  }
}

export function saveGames(games) {
  writeFileSync(gamesFilePath, JSON.stringify(games, null, 2), 'utf8');
}

// Map<guildId, SessionObject>
export const sessions = new Map();

/**
 * Weighted random selection.
 * @param {Map<string, number>} tickets - Map of gameId -> ticket count
 * @returns {string} winning gameId
 */
export function weightedRandom(tickets) {
  const entries = [...tickets.entries()].filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  // Fallback (floating point edge case)
  return entries[entries.length - 1][0];
}
