import sqlite3
import os
import json
import random
import string
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "foresight.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
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

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            mode TEXT NOT NULL,
            health_score INTEGER,
            action_plan TEXT,
            issue_created_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


def list_repositories():
    conn = get_conn()
    rows = conn.execute("SELECT id, name, owner, gitlab_url, project_id, created_at FROM repositories ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_repository(repo_id: str):
    conn = get_conn()
    try:
        row = conn.execute("SELECT id, name, owner, gitlab_url, project_id, created_at FROM repositories WHERE id = ?", (repo_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def insert_repository(repo: dict):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO repositories (id, name, owner, gitlab_url, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (repo["id"], repo["name"], repo["owner"], repo["gitlab_url"], repo["project_id"], repo["created_at"])
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        repo["id"] = generate_id("repo")
        conn.execute(
            "INSERT INTO repositories (id, name, owner, gitlab_url, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (repo["id"], repo["name"], repo["owner"], repo["gitlab_url"], repo["project_id"], repo["created_at"])
        )
        conn.commit()
    finally:
        conn.close()


def delete_repository(repo_id: str):
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def insert_analysis(analysis: dict):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO analyses (id, repo_id, created_at, issue_stats, mr_stats, pipeline_stats, commit_stats, summary, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (analysis["id"], analysis["repo_id"], analysis["created_at"], analysis["issue_stats"], analysis["mr_stats"], analysis["pipeline_stats"], analysis["commit_stats"], analysis["summary"], analysis["score"])
        )
        conn.commit()
    finally:
        conn.close()


def list_analyses(repo_id: str):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM analyses WHERE repo_id = ? ORDER BY created_at DESC", (repo_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def insert_recommendation(rec: dict):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO recommendations (id, repo_id, analysis_id, type, title, description, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rec["id"], rec["repo_id"], rec["analysis_id"], rec["type"], rec["title"], rec["description"], rec["priority"], rec["status"], rec["created_at"])
        )
        conn.commit()
    finally:
        conn.close()


def list_recommendations(repo_id: str):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM recommendations WHERE repo_id = ? ORDER BY created_at DESC", (repo_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_recommendation_status(rec_id: str, status: str):
    conn = get_conn()
    try:
        cur = conn.execute("UPDATE recommendations SET status = ? WHERE id = ?", (status, rec_id))
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def insert_audit_log(log: dict):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO audit_logs (project_id, mode, health_score, action_plan, issue_created_at) VALUES (?, ?, ?, ?, ?)",
            (log["project_id"], log["mode"], log["health_score"], log["action_plan"], log.get("issue_created_at"))
        )
        conn.commit()
    finally:
        conn.close()


def get_repository_by_project_id(project_id: str):
    conn = get_conn()
    try:
        row = conn.execute("SELECT id FROM repositories WHERE project_id = ?", (project_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def generate_id(prefix: str) -> str:
    import random
    import string
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp())}_{suffix}"
