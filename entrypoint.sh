#!/bin/bash
# =============================================================================
# Foresight EM Agent - 容器入口点
# =============================================================================
# 启动 supervisord 前台运行，管理 Caddy + Python 后端两个进程。
# 
# 行为：
# - Caddy 或 Backend 崩溃 → supervisord 自动重启（最多 5 次）
# - 达到重启上限（FATAL）→ event listener 通知 supervisord 退出
# - 容器退出 → Render 检测到并自动重启整个服务
# - 手动停止任一进程 → 同样触发容器退出（确保状态一致）
# =============================================================================

set -euo pipefail

# 确保日志目录存在
mkdir -p /var/log/supervisor

echo "[entrypoint] Starting Foresight EM Agent..."
echo "[entrypoint] Backend: uvicorn api.server:app on 127.0.0.1:8081"
echo "[entrypoint] Proxy:   Caddy on :${PORT:-8080}"
echo "[entrypoint] Frontend: serving static files from /app/frontend/dist"

# 将 PORT 注入 Caddy 环境变量（Caddyfile 使用 $PORT）
export PORT="${PORT:-8080}"

# 前台启动 supervisord（nodaemon=true）
# supervisord 退出时，整个容器退出
exec supervisord -c /etc/supervisor/supervisord.conf
