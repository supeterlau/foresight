# Foresight EM Agent 重构计划 — 进度

## 目标
- 使用 Google ADK 重写 Python 后端，杜绝手写 Agent ✅
- 所有 GitLab 数据请求走真实 API，消灭 mock/fake 数据 ✅
- 前后端分离：前端 → Render Static Site，后端 → Render Web Service (Docker) ✅
- proxy.ts 推迟到最后实现，开发期前端直接对接 Python 后端
- TS 前端保持不动

---

## 完成情况

### Phase 1: 目录整理 ✅
- 旧 TS 后端文件 → `archive/`
- 废弃文件清理（`agent.py`、`server.py`、`server.ts`）
- `frontend/`、`backend/` 目录创建

### Phase 2: Python ADK 后端 ✅
| 文件 | 说明 |
|------|------|
| `backend/api/database.py` | SQLite CRUD（无 mock）|
| `backend/api/gitlab_client.py` | 真实 GitLab REST API v4 客户端 |
| `backend/api/agent.py` | Google ADK Agent + `FunctionTool` |
| `backend/api/server.py` | FastAPI 应用，对接所有前端端点 |
| `backend/Dockerfile` | Render Web Service 部署 |

### Phase 3: 前端适配 ✅
- `package.json` 瘦身（移除后端依赖）
- `vite.config.ts` 添加 API proxy
- `.env` / `.env.example` 更新 `VITE_API_URL`

### Phase 4: 根目录清理 ✅
- `/workspaces/repos/` 只保留 `foresight/`

### Phase 5: 验证 ✅
- 前端测试: 9 passed
- 后端测试: 14 passed
- 前端构建: ✅
- Docker 构建: ✅

---

## 剩余工作
- [ ] `proxy.ts`（推迟，最后实现）
- [ ] 部署到 Render（需配置 backend service + frontend static site）
