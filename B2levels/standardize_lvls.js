/**
 * standardize_lvls.js
 *
 * Purpose:
 *   - Read puzzle layouts from SQLite database `b2levels.db`, table `lvls`
 *   - Standardize each 6x6 board string by renaming blocks in order of first appearance
 *   - Write standardized results into table `lvlstd` (with fields: board_std, moves, c_size)
 *
 * Standardization rules:
 *   - The board string is 36 characters (6 rows × 6 columns, row-major order).
 *   - 'o' means empty cell, keep as 'o'.
 *   - 'A' is the special block, always preserved as 'A'.
 *   - Other block letters are renamed in order of first appearance during a left‑to‑right,
 *     top‑to‑bottom scan:
 *       * The first new block encountered becomes 'B'
 *       * The second new block becomes 'C'
 *       * And so on...
 *   - This ensures that two structurally identical boards (even if using different letters)
 *     will map to the same standardized string.
 *
 * Implementation notes:
 *   - Uses better-sqlite3 for synchronous DB access (fast and simple).
 *   - Processes rows in batches to avoid loading the entire table into memory.
 *   - Prints progress every N rows.
 *   - No deduplication is done here; you can later run SQL queries on lvlstd to deduplicate.
 *
 * Usage:
 *   1. Install dependency:  npm install better-sqlite3
 *   2. Run:                node standardize_lvls.js
 *
 * Author: @l9p.sr0
 * Date:   2025-10-10
 */

const Database = require('better-sqlite3');

// ---------------- Configuration ----------------
const DB_PATH = 'b2levels.db';
const SRC_TABLE = 'lvls';
const DST_TABLE = 'lvlstd';
const BATCH_SIZE = 500;       // rows per batch
const PROGRESS_STEP = 5000;   // print progress every N rows

// Alphabet for block renaming (excluding 'A')
const ALPHABET = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---------------- Setup DB ----------------
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.warn('Could not enable WAL mode:', e.message);
}

// Create destination table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS ${DST_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board TEXT NOT NULL,
    moves INTEGER,
    c_size INTEGER
  );
`);

// Count total rows for progress reporting
const totalRowsRow = db.prepare(`SELECT COUNT(1) AS cnt FROM ${SRC_TABLE}`).get();
const TOTAL_ROWS = totalRowsRow ? totalRowsRow.cnt : 0;

// ---------------- Standardization function ----------------
/**
 * Standardize a 36-character board string.
 * @param {string} board - Original board string
 * @returns {string} - Standardized board string
 */
function standardizeBoard(board) {
  if (typeof board !== 'string' || board.length !== 36) {
    throw new Error('Invalid board string length');
  }

  const chars = board.split('');
  const seen = new Map();
  seen.set('A', 'A'); // preserve special block
  let alphIdx = 0;

  const out = new Array(36);

  for (let i = 0; i < 36; i++) {
    const ch = chars[i];
    if (ch === 'o' || ch === 'A') {
      out[i] = ch;
      continue;
    }
    if (seen.has(ch)) {
      out[i] = seen.get(ch);
      continue;
    }
    if (alphIdx >= ALPHABET.length) {
      throw new Error('Too many distinct blocks in board');
    }
    const assigned = ALPHABET[alphIdx++];
    seen.set(ch, assigned);
    out[i] = assigned;
  }

  return out.join('');
}

// ---------------- Main processing loop ----------------
(function main() {
  console.log(`Starting single-thread standardization: ${TOTAL_ROWS} rows total`);

  const readStmt = db.prepare(`SELECT board, moves, c_size FROM ${SRC_TABLE} LIMIT ? OFFSET ?`);
  const insertStmt = db.prepare(`INSERT INTO ${DST_TABLE} (board, moves, c_size) VALUES (?, ?, ?)`);

  let offset = 0;
  let processed = 0;
  const t0 = Date.now();

  while (offset < TOTAL_ROWS) {
    const rows = readStmt.all(BATCH_SIZE, offset);
    if (!rows || rows.length === 0) break;

    const insertTransaction = db.transaction((rows) => {
      for (const row of rows) {
        try {
          const board_std = standardizeBoard(row.board);
          insertStmt.run(board_std, row.moves, row.c_size);
        } catch (e) {
          // If invalid, skip or log (here we just skip)
          console.error(`Error standardizing board at offset ${offset}:`, e.message);
        }
      }
    });

    insertTransaction(rows);

    processed += rows.length;
    offset += rows.length;

    if (processed % PROGRESS_STEP === 0 || processed >= TOTAL_ROWS) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = (processed / elapsed).toFixed(1);
      const pct = ((processed / TOTAL_ROWS) * 100).toFixed(2);
      console.log(`Processed ${processed}/${TOTAL_ROWS} (${pct}%), avg ${rate} rows/sec`);
    }
  }

  const elapsedTotal = (Date.now() - t0) / 1000;
  console.log(`Done. Processed ${processed} rows in ${elapsedTotal.toFixed(1)}s, avg ${(processed / elapsedTotal).toFixed(1)} rows/sec`);

  db.close();
})();
