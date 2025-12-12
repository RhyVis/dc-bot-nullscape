import Database from 'better-sqlite3';
import path from 'node:path';
import { logger } from '../core/logger.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(process.cwd(), 'bot-nullscape.db');

  db = new Database(dbPath);

  // 基本优化设置
  db.pragma('journal_mode = WAL');

  // 初始化 settings 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 初始化 presets 表（提示词预设，完全由管理员维护）
  db.exec(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      quality_tags TEXT NOT NULL,
      negative_tags TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  logger.info('SQLite database initialized', { dbPath });

  return db;
}
