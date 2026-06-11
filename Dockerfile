# =============================================================================
# Stage 1: 构建前端 (Node.js)
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# 先复制依赖文件，利用 Docker 缓存层
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# 复制前端源码并构建
COPY frontend/ .
RUN npm run build

# =============================================================================
# Stage 2: 运行环境 (Python + Caddy + Supervisor)
# =============================================================================
FROM python:3.12-slim

# ── 系统依赖 + Caddy + Supervisor ──────────────────
# 使用 Caddy 官方 APT 仓库安装（比 GitHub 直接下载更稳定）
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    ca-certificates \
    gnupg \
    debian-keyring \
    debian-archive-keyring \
    apt-transport-https \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list \
    && apt-get update && apt-get install -y caddy \
    && rm -rf /var/lib/apt/lists/*

# ── Python 后端 ─────────────────────────────────────
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# ── 前端静态文件 ────────────────────────────────────
COPY --from=frontend-builder /build/dist /app/frontend/dist

# ── Caddy + Supervisor 配置 ─────────────────────────
COPY Caddyfile /etc/caddy/Caddyfile
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY entrypoint.sh exit_on_crash.py /app/
RUN chmod +x /app/entrypoint.sh /app/exit_on_crash.py

# Render 通过 PORT 环境变量指定端口
EXPOSE 7860

# ── 启动入口 ────────────────────────────────────────
# Supervisor 前台运行，管理所有子进程
# 任一进程崩溃 → event listener 通知 supervisord 退出 → 容器退出 → Render 自动重启
CMD ["/app/entrypoint.sh"]
