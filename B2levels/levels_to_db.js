/**
 * levels_to_db.js
 * ----------------
 * 用途：
 *   - 从原始的 levels.js 文件中提取所有关卡定义
 *   - 将每个关卡转换为标准化的 36 字符棋盘字符串
 *   - 按照棋盘出现顺序重新命名方块（A 为目标方块，其余依次 B、C...）
 *   - 将结果写入 SQLite 数据库 b2levels.db 的表 B2Lvls
 *
 * 数据库表结构：
 *   B2Lvls (
 *     lvl_no INTEGER NOT NULL,  // 关卡编号（从 1 开始）
 *     board  TEXT    NOT NULL   // 标准化的 36 字符棋盘字符串
 *   )
 *
 * 使用说明：
 *   1. 确保已安装 better-sqlite3: npm install better-sqlite3
 *   2. 将本文件放在合适位置，保证 ../www/levels.js 存在
 *   3. 运行: node levels_to_db.js
 *   4. 向 b2levels.db，重建表 B2Lvls
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// === 读取 levels.js 原始文本 ===
const raw = fs.readFileSync(path.join(__dirname, '../www/levels.js'), 'utf-8');

// 提取顶层数组的内部内容（第一个 [ 到最后一个 ] 之间）
const start = raw.indexOf('[');
const end = raw.lastIndexOf(']');
if (start < 0 || end < 0 || end <= start) {
  throw new Error('无法定位顶层数组的边界');
}
const inner = raw.slice(start + 1, end);

// 用正则提取每一关
const regex = /(\[.*?\])/gs;
const levelStrings = Array.from(inner.matchAll(regex)).map(m => m[1]);
if (levelStrings.length === 0) {
  throw new Error('未匹配到任何关卡子数组，请检查正则或源文件格式');
}

// 将每个字符串解析为 JS 对象（数组形式的 blocks）
const levels = levelStrings.map(str => Function(`"use strict"; return ${str}`)());

/**
 * 将单个关卡转换为 36 字符串
 * - x 表示列，y 表示行
 * - hz=true 表示水平放置，沿列方向延伸
 * - hz=false 表示垂直放置，沿行方向延伸
 * - 放置时先用中立 ID 标记
 * - 最后扫描棋盘，按出现顺序重新映射为 A、B、C...
 */
function formatLevel(blocks) {
  const N = 6;
  const gridIds = Array(N * N).fill(null);

  // 1) 放置方块
  for (let i = 0; i < blocks.length; i++) {
    const { x, y, length, hz } = blocks[i];
    for (let j = 0; j < length; j++) {
      const row = hz ? y : y + j;
      const col = hz ? x + j : x;
      const idx = row * N + col;
      if (gridIds[idx] !== null) {
        throw new Error(`重叠: (${row},${col}) block ${gridIds[idx]} vs ${i}`);
      }
      gridIds[idx] = i;
    }
  }

  // 2) 扫描棋盘，确定出现顺序
  const seen = new Set();
  const order = [];
  for (let idx = 0; idx < gridIds.length; idx++) {
    const id = gridIds[idx];
    if (id !== null && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }

  // 3) 建立 ID -> 字母映射
  const map = new Map();
  map.set(0, 'A'); // 第一个 block 永远是 A
  let next = 1;
  for (const id of order) {
    if (id === 0) continue;
    map.set(id, ALPHABET[next++]);
  }

  // 4) 输出最终字符串
  return gridIds.map(id => (id === null ? 'o' : map.get(id))).join('');
}

// === 构建所有关卡的标准字符串 ===
const boards = levels.map(formatLevel);

// === 写入 SQLite (b2levels.db) ===
const db = new Database('b2levels.db');

// 重建表 B2Lvls(lvl_no, board)
db.exec(`
  DROP TABLE IF EXISTS B2Lvls;
  CREATE TABLE B2Lvls (
    lvl_no INTEGER NOT NULL,
    board  TEXT    NOT NULL
  );
`);

// 插入所有关卡
const insert = db.prepare('INSERT INTO B2Lvls (lvl_no, board) VALUES (?, ?)');
const insertMany = db.transaction((rows) => {
  rows.forEach((board, idx) => {
    insert.run(idx + 1, board); // lvl_no 从 1 开始
  });
});
insertMany(boards);

console.log(`✅ 已写入 ${boards.length} 个关卡到 b2levels.db 的 B2Lvls(lvl_no, board)`);
