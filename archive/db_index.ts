import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';

// Setup local SQLite database file path
const dbPath = path.join(process.cwd(), 'foresight.db');
const sqlite = new Database(dbPath);

// Enable foreign keys in SQLite
sqlite.pragma('foreign_keys = ON');

// Automatically bootstrap tables on initialization for smooth container runs
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    gitlab_url TEXT NOT NULL,
    project_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    issue_stats TEXT NOT NULL,
    mr_stats TEXT NOT NULL,
    pipeline_stats TEXT NOT NULL,
    commit_stats TEXT NOT NULL,
    summary TEXT NOT NULL,
    score INTEGER NOT NULL,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL,
    analysis_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
  );
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
