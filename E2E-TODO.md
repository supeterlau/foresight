# Foresight E2E Test Plan

> Playwright + Chromium 端到端测试规划
> 目标：覆盖所有用户可见交互路径、API 数据流和异常状态

## 环境配置

### 前置条件

- [ ] `playwright` + `@playwright/test` 已安装（✅ 已完成）
- [ ] Chromium browser 已下载（✅ 已完成）
- [ ] 配置 `E2E_BASE_URL` 环境变量（默认 `http://localhost:8080`）
- [ ] 配置 `GITLAB_PRIVATE_TOKEN` 用于 API 测试
- [ ] 编写 `e2e/playwright.config.ts`（✅ 已完成）
- [ ] 设置 `GOOGLE_API_KEY`（从 `/workspaces/repos/envs/gemini-peter` 读取）- 用于项目 agent 的 Gemini 调用
- [ ] 添加 `npm run test:e2e` 脚本到 `package.json`（✅ 已完成）

### 启动方式

```bash
# 终端 1：启动应用（Docker）- 需要 Gemini API Key
cd /workspaces/repos/foresight
docker run -p 7860:7860 -e PORT=7860 \
  -e GITLAB_PRIVATE_TOKEN=your_token \
  -e GOOGLE_API_KEY=$(cat /workspaces/repos/envs/gemini-peter) \
  foresight:test

# 终端 2：运行 e2e 测试
cd frontend && npm run test:e2e

# 查看报告
npx playwright show-report e2e/playwright-report
```

---

## 测试目录结构

```
frontend/e2e/
├── playwright.config.ts        # Playwright 配置（已完成）
├── tests/
│   ├── 00-health.spec.ts       # 健康检查 + 基础连通性
│   ├── 01-landing.spec.ts      # 着陆页完整测试
│   ├── 02-dashboard.spec.ts    # 仪表盘完整测试
│   ├── 03-repository.spec.ts   # Repository CRUD 流程
│   ├── 04-analysis.spec.ts     # 分析流程 + Agent 交互
│   ├── 05-auth.spec.ts         # GitLab OAuth 流程
│   ├── 06-recommendations.spec.ts  # 建议管理流程
│   ├── 07-sprint-planner.spec.ts   # Sprint 规划器流程
│   ├── 08-edge-cases.spec.ts       # 边界情况 + 错误处理
│   └── 09-responsive.spec.ts       # 响应式布局测试
└── fixtures/
    └── test-data.ts            # 测试数据工厂
```

---

## 测试用例详情

### 00. 健康检查 + 基础连通性

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 00-01 | `/api/health` 返回 200 | GET `/api/health` | status=200, body.status 为 "healthy" 或 "degraded" |
| 00-02 | 前端页面加载 | GET `/` | 200，HTML 包含 `<div id="root">` |
| 00-03 | JS 资源可访问 | 检查页面 `<script>` src | 200，MIME 正确 |
| 00-04 | CSS 资源可访问 | 检查页面 `<link>` href | 200，MIME 正确 |
| 00-05 | SPA 路由回退 | GET `/任意不存在路径` | 返回 index.html 内容 |

### 01. 着陆页 (Landing Page)

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 01-01 | 着陆页完整渲染 | 直接访问 `/` | Hero、功能网格、FAQ、联系表单全部可见 |
| 01-02 | 标题和描述文案 | 检查页面文本 | 标题包含 "代码库风险" 或 "codebase risk" |
| 01-03 | 模式切换（MCP/API） | 点击 MCP/API Tab | 切换后提示文案变化 |
| 01-04 | URL 输入框交互 | 输入 GitLab URL → 提交 | 调用 POST /api/repositories |
| 01-05 | URL 输入验证 - 空值 | 不输入直接提交 | 显示错误提示 |
| 01-06 | URL 解析 - 完整 URL | 输入 `https://gitlab.com/namespace/project` | 正确解析 owner/name/projectId |
| 01-07 | URL 解析 - ID | 输入纯数字 ID | 正确设置为 projectId |
| 01-08 | Demo 仓库按钮 | 点击 Demo 按钮 | 跳转到仪表盘并自动选择仓库 |
| 01-09 | FAQ 手风琴 | 点击 FAQ 问题 | 展开/折叠答案内容 |
| 01-10 | 联系表单 - 提交 | 填写邮箱+消息 → 提交 | 显示成功消息 |
| 01-11 | 联系表单 - 空值验证 | 不填直接提交 | 浏览器原生 required 提示 |
| 01-12 | GitLab 连接按钮 | 点击 "Connect GitLab" | 打开 OAuth 弹出窗口 |
| 01-13 | 语言切换（zh↔en） | 点击语言切换按钮 | 页面文案在中文/英文间切换 |
| 01-14 | "Enter Dashboard" 按钮 | 已有仓库时点击 | 切换到仪表盘视图 |
| 01-15 | 功能网格渲染 | 检查 Feature 区域 | 3 个功能卡片：Bus Factor、Merge Latency、Gemini |

### 02. 仪表盘 (Dashboard)

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 02-01 | 仪表盘布局 | 从 Landing 进入 App | 左侧仓库列表、右侧主内容区 |
| 02-02 | 仓库侧边栏 | 检查侧边栏 | 显示仓库列表、计数 badge |
| 02-03 | 仓库选择 | 点击不同仓库 | 主内容区切换显示对应仓库数据 |
| 02-04 | 仓库选择（键盘） | Tab + Enter | 同上，键盘可操作 |
| 02-05 | 空仓库列表状态 | 仓库列表为空 | 显示 "No tracked projects" |
| 02-06 | 加载中状态 | 仓库加载中 | 显示 "Loading database..." |
| 02-07 | 返回 Landing | 点击 Header Logo / "Back Home" | 回到 Landing 页 |
| 02-08 | "Monitored Projects" 标题 | 检查侧边栏头部 | 显示计数 badge |
| 02-09 | 仓库信息面板 | 选择仓库 | 显示仓库名、owner、branch、GitLab 链接 |
| 02-10 | GitLab 连接状态 | 已连接/未连接 | Header 显示不同 UI |
| 02-11 | 无仓库选择状态 | 无选中仓库 | 显示 "No project selected" 占位 |
| 02-12 | Footer 信息 | 滚动到底部 | 显示 "Foresight EM Agent Framework" |

### 03. Repository CRUD

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 03-01 | 打开 Add 弹窗 | 点击 "Add Project" | 弹出 Modal |
| 03-02 | 关闭 Modal | 点击 ✕ / 背景 / Cancel | Modal 关闭 |
| 03-03 | Modal 表单 - 必填验证 | 不填 GitLab URL / Project ID | 显示错误提示 |
| 03-04 | Modal 表单 - 成功添加 | 填写完整 → 提交 | 仓库出现在列表，选中新仓库 |
| 03-05 | Modal 表单 - URL 格式验证 | 输入非 http URL | 验证失败提示 |
| 03-06 | 删除仓库 | 点击垃圾桶图标 → 确认 | 仓库从列表移除 |
| 03-07 | 删除后自动选择 | 删除当前选中仓库 | 自动选择下一个仓库 |
| 03-08 | 删除最后一个仓库 | 删除唯一的仓库 | 显示空状态 |
| 03-09 | 重复 projectId 添加 | 添加已存在的 projectId | 服务端 409 错误提示 |

### 04. 分析流程 (Analysis)

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 04-01 | 自动加载已有分析 | 选择有分析历史的仓库 | 自动加载分析结果和 Health Score |
| 04-02 | 触发 AI Audit | 点击 "Trigger AI Audit" | 按钮显示 loading 动画 |
| 04-03 | 分析加载中状态 | 分析进行中 | 内容区域半透明 + pointer-events: none |
| 04-04 | 分析完成渲染 | 等待分析完成 | HealthScore、Bottlenecks、Telemetry 全部更新 |
| 04-05 | 分析错误状态 | 无 token 时分析 | 显示错误 banner |
| 04-06 | 错误 banner 关闭 | 点击 ✕ | Banner 消失 |
| 04-07 | 无仓库时分析按钮 | 未选中仓库 | Trigger 按钮禁用或不可见 |
| 04-08 | X-GitLab-Token 传递 | 分析请求 | Header 中包含 Token |

### 05. GitLab OAuth 认证

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 05-01 | 获取 Auth URL | 点击 Connect GitLab | 发起 GET /api/auth/url |
| 05-02 | OAuth 弹出窗口 | 点击连接按钮 | 弹出 640×750 窗口 |
| 05-03 | Popup 被拦截时 | 浏览器阻止弹出 | 显示 "Popup blocked" 错误提示 |
| 05-04 | OAuth 回调处理 | 接收 postMessage | Token 存入 localStorage |
| 05-05 | OAuth 登录成功 UI | 认证完成后 | 显示已连接状态 + 用户名 + 断开按钮 |
| 05-06 | 断开 GitLab | 点击 Disconnect | 清除 localStorage，显示 "Connect" 按钮 |
| 05-07 | Token 持久化 | 刷新页面 | 从 localStorage 恢复登录状态 |
| 05-08 | OAuth URL origin 参数 | 检查请求 | URL 包含当前 origin |

### 06. 建议管理 (Recommendations)

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 06-01 | 建议列表加载 | 分析完成 | 显示 Action Recommendations 列表 |
| 06-02 | Tab 切换（pending/resolved/dismissed） | 点击不同 Tab | 过滤对应状态的建议 |
| 06-03 | 标记为 Resolved | 点击 Resolve | 状态更新，移出 pending 列表 |
| 06-04 | 标记为 Dismissed | 点击 Dismiss | 状态更新，移出 pending 列表 |
| 06-05 | 还原为 Pending | 在非 pending Tab 点击 Revert | 回到 pending 列表 |
| 06-06 | 空列表状态 (pending) | 所有建议已处理 | 显示 "No recommendations" + 鼓励文案 |
| 06-07 | 空列表状态 (resolved) | 无已解决建议 | 显示空状态 |
| 06-08 | Loading 状态 | 操作进行中 | 显示 spinner + "Updating recommendations" |
| 06-09 | 建议类型可视化 | 检查列表项 | 显示对应图标（Pipeline/Review/Issues） |
| 06-10 | 建议优先级 badge | 检查列表项 | high/medium/low 对应不同颜色 |

### 07. Sprint 规划器

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 07-01 | Sprint Planner 渲染 | 分析完成 | 显示规划器左右两栏布局 |
| 07-02 | 选择任务 | 点击推荐项 | 选中 → 右侧 "Scheduled Sprint Backlog" 更新 |
| 07-03 | 取消选择任务 | 再次点击已选中项 | 从 backlog 移除 |
| 07-04 | 预测 Health 更新 | 选择不同组合 | Predicted Health 分数 + 变化 |
| 07-05 | Pipeline 选中时指标 | 选中 pipeline 类任务 | CI/CD 进度条变绿色 "Optimized" |
| 07-06 | Review 选中时指标 | 选中 review 类任务 | Review 进度条变绿色 "Accelerated" |
| 07-07 | 修改 Sprint 目标 | 编辑输入框 | 文字更新 |
| 07-08 | 激活 Sprint | 点击 "Activate Iteration Plan" | 显示 "Sprint Activated & Scheduled" |
| 07-09 | 空建议状态 | 无建议时 | 显示 "No active recommendations" |
| 07-10 | 空 Backlog 状态 | 未选中任何任务 | 显示提示选择任务 |

### 08. 边界情况 + 错误处理

| # | 测试场景 | 步骤 | 预期结果 |
|---|---------|------|---------|
| 08-01 | 网络断开 | Mock 网络请求失败 | 显示错误 banner，不崩溃 |
| 08-02 | API 返回 500 | Mock 500 响应 | 前端优雅处理，显示错误信息 |
| 08-03 | API 返回 404 | 请求不存在的仓库 | 前端显示 404 错误 |
| 08-04 | API 超时 | Mock 请求挂起 | 显示 loading，超时后错误提示 |
| 08-05 | localStorage 不可用 | 禁用 localStorage | 不影响页面基本渲染 |
| 08-06 | 无效 Token | 使用过期 Token 分析 | 显示 "401 Unauthorized" 样式错误 |
| 08-07 | 大仓库数据 | 模拟大量 commits/issues | 页面不卡顿，渲染正常 |
| 08-08 | 多次快速操作 | 连续点击 Trigger UI Audit | 防止重复请求 |
| 08-09 | 浏览器窗口缩放 | 不同视口宽度 | 布局自适应 |

### 09. 响应式布局

| # | 测试场景 | 视口 | 预期结果 |
|---|---------|------|---------|
| 09-01 | 桌面 1440px | 1440×900 | 完整布局，左右分栏 |
| 09-02 | 平板 768px | 768×1024 | 侧边栏折叠或在上方 |
| 09-03 | 手机 375px | 375×812 | 单列堆叠布局 |
| 09-04 | 手机 375px - Landing | 375×812 | Hero、功能网格、FAQ 全部适配 |
| 09-05 | 链接可点击性 | 375px | 按钮/链接在 touch 目标区 (>44px) |

---

## API Mocking 策略

推荐使用 **Playwright Route Interception**（`page.route()`）而非独立 mock server：

```typescript
// 示例：mock 健康检查响应
await page.route('**/api/health', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'healthy',
      service: 'Foresight EM Agent',
      database: { status: 'connected', tables: ['repositories'] },
      proxy: { status: 'running', service: 'Caddy' },
    }),
  });
});
```

### Mock 场景矩阵

| 场景 | Mock 的 API | 响应 |
|------|------------|------|
| 健康 | `/api/health` | `{status: "healthy"}` |
| 仓库列表 | `/api/repositories` | 2-3 个仓库 |
| 空列表 | `/api/repositories` | `{repositories: []}` |
| 分析结果 | `/api/repositories/:id/analyze` | 完整分析 payload |
| 分析错误 | `/api/repositories/:id/analyze` | 401 / 404 / 500 |
| 建议列表 | `/api/repositories/:id/recommendations` | 5+ 条建议 |
| 更新状态 | `PATCH /api/repositories/:id/recommendations/:rid` | `{success: true}` |
| 配置 | `/api/config` | `{languages: ["zh", "en"]}` |

---

## 数据工厂 (fixtures)

```typescript
// 示例：测试数据工厂
export const mockRepository = (overrides = {}) => ({
  id: `repo_${Date.now()}`,
  name: 'test-project',
  owner: 'test-org',
  gitlabUrl: 'https://gitlab.com',
  projectId: '12345',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockAnalysisResult = {
  project_health_score: { score: 82, rating: 'Good', summary: 'Health summary' },
  bottlenecks: [{ type: 'CI/CD Pipeline Failure rate', metric: 'Success Rate: 70%', details: 'Detail' }],
  sprint_recommendations: [{ action: 'Fix CI', impact: 'Stability' }],
  risk_analysis: [{ title: 'Bus Factor Risk', severity: 'high', description: 'Risk detail' }],
  analysis: { id: 'a1', repo_id: 'r1', issueStats: {}, mrStats: {}, pipelineStats: {}, commitStats: {} },
};
```

---

## 实施优先级

| 优先级 | 测试文件 | 原因 |
|--------|---------|------|
| P0 | `00-health.spec.ts` | 基础连通性，阻塞所有后续测试 |
| P0 | `01-landing.spec.ts` | 用户第一入口 |
| P0 | `02-dashboard.spec.ts` | 核心页面 |
| P1 | `03-repository.spec.ts` | CRUD 流程 |
| P1 | `04-analysis.spec.ts` | 核心功能 |
| P2 | `05-auth.spec.ts` | OAuth 流程 |
| P2 | `06-recommendations.spec.ts` | 建议管理 |
| P2 | `07-sprint-planner.spec.ts` | 规划器交互 |
| P3 | `08-edge-cases.spec.ts` | 边界情况 |
| P3 | `09-responsive.spec.ts` | 响应式 |

---

## 运行命令

```bash
# 运行所有测试
npx playwright test --config e2e/playwright.config.ts

# 运行单个测试文件
npx playwright test --config e2e/playwright.config.ts tests/01-landing.spec.ts

# 运行带 UI 模式
npx playwright test --config e2e/playwright.config.ts --ui

# 调试模式
npx playwright test --config e2e/playwright.config.ts --debug

# 生成测试代码（codegen）
npx playwright codegen http://localhost:8080
```

---

## 验收标准

- [ ] 所有 P0 用例通过
- [ ] 所有 P1 用例通过
- [ ] P2/P3 用例 ≥ 80% 通过
- [ ] 无 console.error 出现在测试中
- [ ] 测试报告 HTML 可查看
- [ ] 失败时截图保留
- [ ] CI 环境可重复执行
