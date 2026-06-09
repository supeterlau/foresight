---
title: Foreinsight
emoji: 🌖
colorFrom: red
colorTo: gray
sdk: docker
pinned: false
---

# Foresight EM Agent

GitLab project health analysis tool powered by Google ADK + Gemini.

- **Backend:** Python (FastAPI + Google ADK + MCP)
- **Frontend:** React + Vite + Tailwind CSS
- **Infrastructure:** Docker multi-stage build, Caddy reverse proxy, Supervisor process management

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn api.server:app --reload --port 8081

# Frontend
cd frontend
npm install
npm run dev

# Tests
cd backend && pytest -v
cd frontend && npm test
```

## Project Structure

```
├── backend/          # Python ADK backend (FastAPI + MCP Server)
│   ├── api/          # Server, agent, database, GitLab client
│   └── tests/
├── frontend/         # React + Vite + Tailwind UI
│   ├── src/          # Components, types, tests
│   └── e2e/          # Playwright E2E tests
├── Dockerfile        # Multi-stage build
├── Caddyfile         # Reverse proxy config
└── supervisord.conf  # Process management
```
