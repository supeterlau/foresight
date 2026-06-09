# Foresight EM Agent: Google ADK + GitLab MCP Implementation Roadmap

本规划文档阐述如何使用 **Google Agent Development Kit (ADK)** 以及 **GitLab MCP** (Model Context Protocol) 协议和 **REST API** 模式实现完整的研发效能度量与自动化 issue 闭环。

---

## 🎯 架构蓝图与工作流

整个系统基于双模引擎（**MCP 模式** 与 **REST API 模式**），通过用户界面配置快速切换，默认采用 **MCP 模式**。

```
                [前端 React / Next.js UI]
                         │
                         │ (用户提供: GitLab URL, PAT Token, 模式开关)
                         ▼
             [Next.js / Express Proxy Server] 
                         │
                         │ (仅作请求转发与静态资源托管)
                         ▼
          [Python Python-ADK Engine (核心逻辑)]
                         │
        ┌────────────────┴────────────────┐
        ▼ (默认模式)                       ▼ (降级/手动模式)
  【GitLab MCP Server】              【GitLab REST API】
   - 列出仓库 & 运行工具             - GET /projects
   - 自动托管 OAuth / PAT            - GET /issues, /merge_requests
   - 提供标准 Context 资源           - GET /pipelines, /commits
        └────────────────┬────────────────┘
                         ▼
               [Gemini AI 核心分析模型]
               - 识别巴士系数（团队单点风险）
               - 评估管道稳定性 (Pipelines)
               - 分析 MR 滞后与积压指标
                         │
                         ▼
                [生成 Action Plan (Markdown)]
                         │
                         ▼
               [自动化 Issue 创建回路]
               - POST /projects/:id/issues
               - 在对应仓库中生成“风险改进提案”
                         │
                         ▼
              [SQLite 本地历史存档 & 审计]
```

---

## 📅 详细实施步骤 (Implementation Steps)

### 第一阶段：初始化 Python ADK 环境与基础代理
1. **环境准备与依赖声明**：
   - 在 Python 侧安装所需的 `google-genai` 和相关的 MCP SDK (如 `mcp` 或 `adk` 框架依赖库)。
   - 配置 SQLite 作为轻量级历史和配置存储介质，创建 `audit_logs` 表和 `repositories_config` 表。
2. **定义 ADK Agent 逻辑**：
   - 建立 `agent_core.py` 作为主力运行后台。
   - 使用 ADK 的工具注册机制（`adk.register_tool`），封装两个核心工具：
     - `fetch_gitlab_context`：请求拉取核心数据。
     - `create_remediation_issue`：下达 Issue 创建指令。

### 第二阶段：实施“GitLab 双通路”数据驱动器
1. **分支 A：REST API 通路 (Fallback)**：
   - 使用标准 Python `requests` 库连接 `GitLab API v4`。
   - 顺序执行：
     - 拉取项目基本信息：`GET /api/v4/projects/<id>`
     - 拉取活跃 issues 列表：`GET /api/v4/projects/<id>/issues?state=opened`
     - 拉取 MR 信息：`GET /api/v4/projects/<id>/merge_requests?state=opened`
     - 拉取流水线投递：`GET /api/v4/projects/<id>/pipelines`
     - 拉取提交：`GET /api/v4/projects/<id>/repository/commits`
2. **分支 B：MCP 协议通路 (默认模式)**：
   - 调用并注册标准 `GitLab MCP Server` 接口。
   - 通过 MCP Client Bridge 自动转换项目资源为标准 MCP Resources 和 Prompts。
   - 利用 MCP 托管鉴权，直接在上下文对话中为 Gemini 提供格式化代码遥测。
3. **前端/配置开关切换**：
   - 在用户看板中，增加 `Integrate Mode` 下拉单选框：`[MCP (Recommended), Classic REST API]`。
   - 默认选中 `MCP`。当下达分析指令时，后端判定开关并将执行 Payload 路由至对应 Python 执行器分支。

### 第三阶段：Gemini 效能建模与分析 (EM Core)
1. **分析 Prompt 构建**：
   - 编写针对 Engineering Management (EM) 视角的分析链。输入整理好的 Issues, MR 堆积率，以及 Core 提交者活跃分布。
   - 请求 Gemini 重点计算：**Bus Factor (巴士系数)**、**MR Blocked Duration (评审吞吐率)**、**Pipeline Failure Rate (发布稳定性)**。
2. **生成规范化 Action Plan**：
   - 输出统一的 Markdown 格式治疗方案，需包括“诊断指标汇总”、“首要改进点”、“建议会议/敏捷优化策略”。

### 第四阶段：自动闭环创建 Issue
1. **自动转换执行方案**：
   - Agent 判断分析结束后，自动抓取 Action Plan 中“高优先级任务”的概述。
2. **执行 Issue 回写**：
   - 调用 `POST /api/v4/projects/<id>/issues` 接口。
   - 设置标题为 `[Foresight-EM-Remediation] 项目高风险因子阻断及效能改进建议`。
   - 将 Gemini 的 Action Plan 追加至 Issue 描述中，指派或标记为团队全局待办。

### 第五阶段：Express 极简请求转发与服务联动
1. **瘦身 `server.ts`**：
   - 剔除 `server.ts` 中的原主要分析算法，使其退化为纯路由和安全边界。
   - 任何来自前端的 `/api/audit` 或 `/api/generate-plan` 请求，使用 `child_process.spawnSync` 异步或同步拉起 Python 引擎 `python3 agent_core.py --run`。
2. **返回流式或结果数据**：
   - 实时读取 Python 脚本的 `stdout` 输出，解析为 JSON 后直接返还前端。

---

## 🔒 安全与持久化设计

1. **SQLite 结构设计 (`foresight.db`)**：
   ```sql
   CREATE TABLE IF NOT EXISTS audit_logs (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       project_id TEXT NOT NULL,
       mode TEXT NOT NULL,          -- 'mcp' 或 'api'
       health_score INTEGER,
       action_plan TEXT,
       issue_created_at DATETIME,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **PAT 保护**：
   - 个人访问令牌 (PAT Token) 始终保存在用户会话上下文或通过加密后端处理，决不进行客户端常驻存储，确保安全性。

## ⚙️ 部署参数控制 `ENABLE_TS_SERVER_PROXY`

在开发和混合部署模式中，本项目的 TypeScript 转发服务器可以使用此变量安全切换：
- **`ENABLE_TS_SERVER_PROXY=1` (默认值/开发态)**：开启 Express -> Python 挂载代理，支持在开发及本地沙盒预览环境下，直接通过统一的 Node 接口路由执行 Python。
- **`ENABLE_TS_SERVER_PROXY=0` (生产态/云端直连部署)**：由于编译或运行阶段关闭了 TS Server 转发。在此模式下，Google Cloud Agent Builder 可以自动且直接调用后端的 Python 模块，绕过 `server.ts` 以提供更高的计算效能，防止多余的一层网关转发损耗。

