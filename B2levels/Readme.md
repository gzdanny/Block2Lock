# README

## 📌 项目简介

本项目用于整理和对比 **Rush Hour** 类游戏的关卡数据，来源包括：

-   **原始关卡数据库**（来自 [michaelfogleman](https://www.michaelfogleman.com/rush/#DatabaseDownload)）
-   **Block2Lock 游戏自带关卡**（`../www/levels.js`）

通过统一的标准化规则，将两边的关卡转换为 36 字符的棋盘字符串，并在 SQLite 数据库中进行对比分析。

----------

## ⚙️ 环境准备

-   **Navicat Lite**（或其他 SQLite 客户端）
-   **Node.js**（建议 v16+）
-   **better-sqlite3**（Node.js 的 SQLite 驱动）

安装依赖：

```bash
npm install better-sqlite3

```

----------

## 📂 数据库准备

1.  **下载并创建数据库**
    
    -   下载 Navicat Lite，新建数据库 **b2levels.db**
2.  **导入原始关卡数据**
    
    -   从 [michaelfogleman Rush Hour Database](https://www.michaelfogleman.com/rush/#DatabaseDownload) 下载数据
    -   导入到表 **levels**

----------

## 🧹 数据清洗与标准化

### 为什么要数据清洗？

原始数据库中的关卡虽然包含完整的棋盘信息，但 **block 的命名没有规律**（例如同样的布局可能因为 block 命名不同而被认为是不同关卡）。  
为了能够进行 **相似性判断和去重**，必须对关卡进行标准化处理：

-   统一棋盘表示为 36 字符串
-   统一 block 命名规则：A 固定为目标车，其余按棋盘出现顺序依次命名 B、C、D…

### 清洗步骤

1.  **创建视图 lvls**  
    过滤掉包含固定墙（`x`）的关卡：
    
    ```sql
    CREATE VIEW lvls AS
    SELECT *
    FROM levels
    WHERE puzzle NOT LIKE '%x%';
    
    ```
    
2.  **标准化原始关卡**  
    使用 **Node.js 脚本** `standardize_lvls.js`：
    
    ```bash
    node standardize_lvls.js
    
    ```
    
    -   读取 `lvls` 视图
    -   按规则重新转换为新的 36 字符棋盘字符串
    -   生成表 **lvlstd**，包含字段：
        -   `board` (TEXT) — 标准化后的棋盘字符串
        -   `moves` (INTEGER) — 原最优步数
        -   `c_size` (INTEGER) — 原解空间大小

----------

## 📥 数据导入 Block2Lock 关卡

### 为什么要数据导入？

Block2Lock 的原始关卡数据存放在 **JavaScript 文件** `levels.js` 中，格式与数据库不一致。  
为了能够与原始数据库进行对比，必须将其 **转换为相同的标准化格式**，即 36 字符棋盘字符串，并存入数据库。

### 转换步骤

使用 **Node.js 脚本** `levels_to_db.js`：

```bash
node levels_to_db.js

```

-   读取 `www/levels.js`
-   按相同规则标准化
-   生成表 **B2Lvls**，包含字段：
    -   `lvl_no` (INTEGER) — 原始 levels.js 中的关卡序号（1-based）
    -   `board` (TEXT) — 标准化棋盘字符串

----------

## 🔍 数据对比

### 找出两边都有的关卡

```sql
SELECT
  l.board,
  l.moves,
  l.c_size,
  b.lvl_no
FROM lvlstd AS l
INNER JOIN B2Lvls AS b
  ON l.board = b.board
ORDER BY b.lvl_no;

```

### 找出 B2Lvls 独有的关卡

```sql
SELECT
  b.lvl_no,
  b.board
FROM B2Lvls AS b
LEFT JOIN lvlstd AS l
  ON b.board = l.board
WHERE l.board IS NULL
ORDER BY b.lvl_no;

```

----------

## 📑 总结

-   **数据清洗**：解决原始数据库中 block 命名无规律的问题，使得相似性判断和去重成为可能。
-   **数据导入**：解决 Block2Lock 原始关卡数据为 JS 文件的问题，转换为与数据库一致的格式，保证可比性。
-   **最终对比**：通过 SQL JOIN 查询，分析两边关卡的重合与差异。
