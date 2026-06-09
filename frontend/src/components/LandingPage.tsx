import React, { useState } from 'react';
import { 
  GitBranch, 
  Terminal, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle, 
  HelpCircle, 
  Send, 
  ChevronDown, 
  ArrowRight, 
  ExternalLink,
  Code2,
  FileCheck,
  User,
  Heart
} from 'lucide-react';
import { motion } from 'motion/react';
import { Repository } from '../types';

interface LandingPageProps {
  onExploreDemo: (repoId: string) => void;
  onAddCustomRepo: (repo: { name: string; owner: string; gitlabUrl: string; projectId: string }) => void;
  repositories: Repository[];
  onConnectGitLab: () => void;
  gitlabToken: string;
  gitlabUser: any;
  onDisconnectGitLab: () => void;
  currentLanguage: 'zh' | 'en';
  t: (zh: string, en: string) => string;
}

export default function LandingPage({
  onExploreDemo,
  onAddCustomRepo,
  repositories,
  onConnectGitLab,
  gitlabToken,
  gitlabUser,
  onDisconnectGitLab,
  currentLanguage,
  t
}: LandingPageProps) {
  // Parsing and Input States
  const [activeMode, setActiveMode] = useState<'mcp' | 'api'>('mcp');
  const [gitlabUrlInput, setGitlabUrlInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Parse direct GitLab URLs
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');
    setSuccessMsg('');

    if (!gitlabUrlInput.trim()) {
      setInputError(t('请输入 GitLab 项目 ID、相对路径或完整仓库链接', 'Please enter GitLab Project ID, relative path or full repository URL'));
      return;
    }

    if (activeMode === 'api' && !gitlabToken) {
      setInputError(t('您尚未授权！请先在下方点击【连接你的 GitLab 账户 (OAuth)】进行授权绑定再进行关联。', 'Unauthorized! Please click "Connect GitLab (OAuth)" below to authenticate before associating.'));
      return;
    }

    const trimmed = gitlabUrlInput.trim();
    let parsedRepo = {
      name: '',
      owner: activeMode === 'mcp' ? t('MCP 托管项目', 'MCP Managed Project') : t('REST OAuth 托管项目', 'REST OAuth Managed Project'),
      gitlabUrl: 'https://gitlab.com',
      projectId: ''
    };

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        const pathname = url.pathname.replace(/^\/|\/$/g, '');
        const parts = pathname.split('/');
        
        if (parts.length >= 2) {
          parsedRepo.owner = parts[0];
          parsedRepo.name = parts[parts.length - 1];
          parsedRepo.gitlabUrl = `${url.protocol}//${url.host}`;
          parsedRepo.projectId = pathname; // full path namespace/project-name
        } else if (parts.length === 1 && parts[0]) {
          parsedRepo.name = parts[0];
          parsedRepo.gitlabUrl = `${url.protocol}//${url.host}`;
          parsedRepo.projectId = parts[0];
        } else {
          setInputError('无法解析该链接，请确认格式是否正确');
          return;
        }
      } catch (err) {
        setInputError('链接格式无效，请检查 URL');
        return;
      }
    } else {
      // Regard as direct project path or number ID
      parsedRepo.name = trimmed.includes('/') ? trimmed.split('/').pop() || trimmed : trimmed;
      parsedRepo.projectId = trimmed;
    }

    try {
      localStorage.removeItem('gitlab_private_token'); // Clean up any stale private token
      onAddCustomRepo(parsedRepo);
      setSuccessMsg(t(
        `成功绑定项目 (${activeMode === 'mcp' ? 'MCP' : 'REST'} 模式): ${parsedRepo.name || parsedRepo.projectId}`,
        `Successfully linked project (${activeMode === 'mcp' ? 'MCP' : 'REST'} mode): ${parsedRepo.name || parsedRepo.projectId}`
      ));
      setGitlabUrlInput('');
    } catch (err: any) {
      setInputError(err.message || t('绑定失败，请稍后重试', 'Binding failed, please try again later'));
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) return;
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactEmail('');
      setContactMessage('');
    }, 3000);
  };

  // Seeded demo repositories to prompt user
  const demoRepositories = repositories.filter(
    repo => repo.id === 'repo_demo_1' || repo.id === 'repo_demo_2'
  );

  return (
    <div className="flex-1 bg-[#faf9f6] text-zinc-900 selection:bg-zinc-200 select-none font-sans overflow-x-hidden">
      
      {/* Decorative Grid Mesh Overlay - Notion Vibe */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Hero / Main Section */}
      <section className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        
        {/* Left Side: Copywriting */}
        <div className="flex-1 space-y-6 text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-150 border border-zinc-250 rounded-full text-[11px] font-mono font-medium text-zinc-650 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI-Driven GitLab Telemetry (EM: Engineering Management)</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] text-zinc-950 font-sans">
            {t('像阅读文档一样，', 'Understand your codebase risk')} <br />
            {t('了解你的 ', 'just like reading ')} <span className="underline decoration-wavy decoration-emerald-500 underline-offset-8">{t('代码库风险', 'documentation.')}</span>。
          </h1>
          
          <p className="text-sm md:text-base text-zinc-500 max-w-xl leading-relaxed">
            {t(
              'Foresight 是一款融合 Google Agent Builder + GitLab MCP 协议桥接与 Gemini 的 EM (Engineering Manager / 工程管理) 效能分析引擎。只需关联你的仓库，它便会自动通过 MCP 客户端对接管道耗时、贡献者巴士系数、MR 审查积压，快速生成下个 Sprint 的安全演进策略。',
              'Foresight combines Google Agent Builder, GitLab MCP network bridges, and Gemini models as an intelligent Engineering Management (EM) telemetry dashboard. Simply bind your project, and the system instantly analyzes active pipelines, contributor bus factor risks, MR code review lag, and dynamically formulates Sprint remediation tasks.'
            )}
          </p>

          {/* Core Call to Action */}
          <div className="p-5 bg-white border-2 border-zinc-900 rounded-2xl shadow-[4px_4px_0px_#18181b] space-y-4 max-w-xl">
            {/* Mode Switcher Buttons */}
            <div className="flex border-b border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('mcp');
                  setInputError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 pb-2 text-xs font-semibold tracking-wide font-mono transition-all border-b-2 ${
                  activeMode === 'mcp'
                    ? 'border-emerald-500 text-zinc-950 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                {t('📦 MCP 托管模式 (Agent Builder 首选)', '📦 MCP Managed Mode (Recommended)')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('api');
                  setInputError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 pb-2 text-xs font-semibold tracking-wide font-mono transition-all border-b-2 ${
                  activeMode === 'api'
                    ? 'border-purple-500 text-zinc-950 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-550'
                }`}
              >
                {t('🔌 传统 REST API 模式', '🔌 Traditional REST API Mode')}
              </button>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-3">
              <div className="space-y-2.5">
                <label className="block text-[10.5px] uppercase font-semibold font-mono tracking-wider text-zinc-400">
                  {t('🚀 输入 GitLab 项目 ID、相对路径或完整链接', '🚀 Enter GitLab Project ID, relative path or repository link')}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 284729  or  gitlab-org/my-subproject"
                    value={gitlabUrlInput}
                    onChange={(e) => setGitlabUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-[#fbfbfa] border-2 border-zinc-900 rounded-xl text-xs placeholder-zinc-400 font-mono text-zinc-800 focus:outline-[#18181b] shadow-sm"
                  />
                  <button
                    type="submit"
                    className={`px-5 py-2.5 border-2 border-zinc-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:translate-y-px ${
                      activeMode === 'mcp'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-white'
                    }`}
                  >
                    <span>{activeMode === 'mcp' ? t('MCP 全自动关联', 'MCP Auto-Link') : t('API 模式关联', 'API Link')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {activeMode === 'mcp' ? (
                  <div className="p-3 bg-emerald-50/45 border border-emerald-200/60 rounded-xl text-[10px] text-emerald-800 leading-normal">
                    💡 {t('<strong>安全标准</strong>: 此模式基于 Google Agent Builder 的 MCP Client 协议自动托管安全验证。在 Cloud Run 部署时，不需要在前端或数据库中提交明文 Token，高度安全。', '<strong>Security Standard</strong>: This mode runs on Google Agent Builder\'s MCP client protocol with auto-managed authentication. It is highly secure and does not expose plain tokens.')}
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-200/50 rounded-xl text-[10px] text-indigo-800 leading-normal">
                    🤝 {t('<strong>即开即用</strong>: 系统将使用您通过 OAuth 安全绑定的 GitLab 会话进行请求转发。请确保您已在下方进行了【连接你的 GitLab 账户 (OAuth)】。', '<strong>Instant Gateway</strong>: This mode proxies requests using your GitLab session authorized via OAuth. Please make sure to complete OAuth linking below first.')}
                  </div>
                )}
              </div>

              {inputError && (
                <p className="text-[11px] text-rose-600 font-medium font-sans flex items-center gap-1">
                  <span>⚠️</span> {inputError}
                </p>
              )}
              {successMsg && (
                <p className="text-[11px] text-emerald-600 font-medium font-sans flex items-center gap-1">
                  <span>✓</span> {successMsg}
                </p>
              )}
            </form>

            <div className="pt-2.5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <span>⚡ {t('或一键探索系统内置演示仓库：', 'Or explore our built-in demo repositories:')}</span>
              </div>
              <div className="flex gap-2">
                {demoRepositories.length > 0 ? (
                  demoRepositories.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => onExploreDemo(repo.id)}
                      className="px-2.5 py-1 bg-[#faf9f6]/90 border border-zinc-250 hover:border-zinc-900 rounded text-[11px] text-zinc-700 hover:text-zinc-950 font-mono font-medium transition-all"
                    >
                      {repo.name} ({repo.projectId})
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => onExploreDemo('')}
                    className="px-2.5 py-1 bg-[#faf9f6]/90 border border-zinc-200 hover:border-zinc-900 rounded text-[11px] text-zinc-700 hover:text-zinc-950 font-mono transition-all"
                  >
                    🚀 {t('进入默认 Demo', 'Enter Default Demo')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Auth State Button */}
          <div className="flex items-center gap-3 pt-3">
            {gitlabToken ? (
              <div className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-3.5 py-2 rounded-xl text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-650 font-mono text-[11px]">
                  {t('已连接至 GitLab: ', 'Connected to GitLab: ')}<span className="text-zinc-900 font-semibold">{gitlabUser?.username || gitlabUser?.name || t('活跃会话', 'Active Session')}</span>
                </span>
                <button
                  type="button"
                  onClick={onDisconnectGitLab}
                  className="text-rose-600 hover:text-rose-700 font-medium ml-1 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]"
                >
                  {t('断开', 'Disconnect')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectGitLab}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-zinc-900 font-medium text-xs rounded-xl transition-all shadow-[2px_2px_0px_#18181b]"
              >
                <GitBranch className="w-4 h-4 text-[#fc6d26]" />
                <span>{t('连接你的 GitLab 账户 (OAuth)', 'Connect My GitLab Account (OAuth)')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Notion Style Hand-Sketched SVG Illustration */}
        <div className="flex-1 w-full max-w-md lg:max-w-none relative flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full relative aspect-square max-w-[420px] bg-white border-2 border-zinc-900 rounded-3xl shadow-[8px_8px_0px_#18181b] p-6 flex flex-col justify-between overflow-hidden"
          >
            {/* Sketch grid background */}
            <div className="absolute inset-0 bg-[#fcfcfc] bg-[radial-gradient(#e4e4e7_1.2px,transparent_1.2px)] bg-[size:1.5rem_1.5rem] opacity-30 pointer-events-none" />

            {/* Simulated Notion Notebook Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 z-10 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[11px] font-mono text-zinc-400 tracking-wider">foresight_audit.spec</span>
            </div>

            {/* Hand Drawn Style SVG Charting & Flows */}
            <div className="flex-1 py-4 flex flex-col justify-center items-center relative z-10">
              <svg viewBox="0 0 400 240" fill="none" className="w-full h-full max-h-[220px]">
                {/* Horizontal hand-drawn graph grid lines */}
                <path d="M 20 180 L 380 180" stroke="#d4d4d8" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M 20 130 L 380 130" stroke="#d4d4d8" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M 20 80 L 380 80" stroke="#d4d4d8" strokeWidth="1" strokeDasharray="3 3" />

                {/* Git branch line (sleek nodes) */}
                <g filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.02))">
                  {/* Commits spline */}
                  <path 
                    d="M 40 180 Q 120 70 200 130 T 360 80" 
                    stroke="#18181b" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                  />
                  {/* Branch fork */}
                  <path 
                    d="M 120 115 Q 180 190 260 180" 
                    stroke="#a1a1aa" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeDasharray="4 2"
                  />
                </g>

                {/* Drawn Points Grid */}
                {/* Point 1 (Alert) */}
                <circle cx="120" cy="115" r="5" fill="#f43f5e" stroke="#18181b" strokeWidth="1.5" />
                {/* Point 2 */}
                <circle cx="200" cy="130" r="5" fill="#18181b" stroke="#18181b" strokeWidth="1.5" />
                {/* Point 3 (Success) */}
                <circle cx="360" cy="80" r="6" fill="#10b981" stroke="#18181b" strokeWidth="1.5" />
                <path d="M 357 80 L 359 82 L 363 78" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

                {/* Hand-drawn style sticky boxes/annotations */}
                {/* Card A (Left Risk Rating Box) */}
                <g className="cursor-pointer">
                  <rect x="50" y="25" width="110" height="42" rx="6" fill="white" stroke="#18181b" strokeWidth="1.5" />
                  <text x="60" y="42" fill="#18181b" fontSize="11" fontFamily="monospace" fontWeight="600">Bus Factor Risk</text>
                  <text x="60" y="56" fill="#f43f5e" fontSize="10" fontFamily="sans-serif">● CRITICAL (78%)</text>
                </g>

                {/* Card B (Right KPI metric Box) */}
                <g>
                  <rect x="230" y="165" width="120" height="42" rx="6" fill="#fcfcfc" stroke="#18181b" strokeWidth="1.5" />
                  <text x="240" y="182" fill="#18181b" fontSize="10.5" fontFamily="monospace" fontWeight="600">Pipeline Velocity</text>
                  <text x="240" y="196" fill="#10b981" fontSize="10.5" fontFamily="sans-serif">✓ EXCELLENT (96%)</text>
                </g>

                {/* Connection nodes arrows */}
                <path d="M 160 46 L 195 46 Q 200 46 200 56 L 200 115" stroke="#71717a" strokeWidth="1" strokeLinecap="round" strokeDasharray="3` 3" />
                <path d="M 120 115 L 120 128" stroke="#f43f5e" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Simulated Notion Status Log */}
            <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0 select-none z-10">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('诊断服务在线', 'Diagnostics Online')}</span>
              </div>
              <span>{t('指数', 'Index')}: 82%</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="bg-white border-y-2 border-zinc-900 py-20 px-6 font-sans">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header description */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {t('极简，却极其实用', 'Minimalist, yet highly practical')}
            </h2>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto">
              {t('Foresight 摒弃多余配置与技术伪装，只关注对研发能效与软件稳定性最核心的指标体系。', 'Foresight bypasses extra configurations and technical masks, focusing solely on the most critical indicator systems for project quality and R&D velocity.')}
            </p>
          </div>

          {/* The Grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 border-2 border-zinc-900 rounded-2xl bg-[#faf9f6] shadow-[3px_3px_0px_#18181b] space-y-3.5 hover:translate-y-[-2px] transition-all">
              <div className="w-10 h-10 border border-zinc-300 bg-white flex items-center justify-center rounded-xl">
                <Code2 className="w-5 h-5 text-zinc-900" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">{t('代码集约度分析 (Bus Factor)', 'Bus Factor Risk Telemetry')}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t('实时探知代码仓库提交的集中度。防止单点极极端风险导致的项目停滞，并为下阶段研发分工提供最优路径。', 'Understand code commit concentration in real-time. Detect and prevent team knowledge monopolies to minimize single-point-of-failure risks.')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 border-2 border-zinc-900 rounded-2xl bg-[#faf9f6] shadow-[3px_3px_0px_#18181b] space-y-3.5 hover:translate-y-[-2px] transition-all">
              <div className="w-10 h-10 border border-zinc-300 bg-white flex items-center justify-center rounded-xl">
                <GitBranch className="w-5 h-5 text-zinc-900" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">{t('MR 速率洞察 (Merge Latency)', 'Merge Latency Insight')}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t('追踪团队协作最关键的瓶颈——合并请求审批滞后，量化评审周期并给予合理拆解意见。', 'Track the absolute bottleneck of project cycle times: Merge Request backlog lag. Quantify active wait periods and optimize flow.')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 border-2 border-zinc-900 rounded-2xl bg-[#faf9f6] shadow-[3px_3px_0px_#18181b] space-y-3.5 hover:translate-y-[-2px] transition-all">
              <div className="w-10 h-10 border border-zinc-300 bg-white flex items-center justify-center rounded-xl">
                <Sparkles className="w-5 h-5 text-zinc-900" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">{t('Gemini 主动演进建议', 'Gemini Remediation Advice')}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t('基于真实遥测状态，通过 Gemini 实时总结并开具改善药方。提供下一步极简 Sprint 规划编排支持。', 'Receive bespoke, real-time remediation tasks generated by Google Gemini models based on the current state of workspace pipelines.')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Accordion - Notion Aesthetic */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 text-center mb-12">
          {t('常见问题解答 (FAQ)', 'Frequently Asked Questions (FAQ)')}
        </h2>
        
        <div className="border border-zinc-300 rounded-xl bg-white divide-y divide-zinc-200 overflow-hidden">
          {[
            {
              q: t("Foresight 中的 EM 和 MCP 代表什么？它是如何和 Google Agent Builder 运作的？", "What do EM and MCP stand for in Foresight, and how do they integrate with Google Agent Builder?"),
              a: t(
                "EM 代表 Engineering Management (工程效能管理) / Engineering Manager (工程经理)。Foresight 已深度融入 Google Cloud Agent Builder 的 Agent Runtime 机制。其内置的 MCP Client 作为通用上下文底层，可以与标准的 GitLab MCP Server 直接建连。所有的数据提取、授权和分析均符合 MCP 正式数据规范，自动托管安全鉴权。",
                "EM stands for Engineering Management or Engineering Manager. Foresight is deeply integrated with Google Cloud Agent Builder runtime mechanisms. Its built-in Model Context Protocol (MCP) Client acts as a contextual intelligence tier layer connecting directly with compliant MCP servers. Data collection, authentication, and analysis conform tightly to formal MCP secure protocols."
              )
            },
            {
              q: t("Foresight 的数据来源是什么？", "What is Foresight's telemetry data source?"),
              a: t(
                "我们直接连接你提供的 GitLab 仓库（支持官方 gitlab.com 及其私有网络）。当用户输入或绑定 GitLab 时，系统将调取其 Issues、Merge Requests、Pipelines 以及 Repository Commits 接口来汇总遥测图景。",
                "We establish direct secure channels with your GitLab repository (supporting both gitlab.com SaaS and self-hosted instances). Once you register a project relative path or ID, Foresight queries Issues, Merge Request backlogs, active pipeline statuses, and Commit frequencies to construct the full-scope telemetry dashboard."
              )
            },
            {
              q: t("对私有仓库支持如何？如何进行安全对接？", "How are private repositories supported, and is it secure?"),
              a: t(
                "Foresight 采用标准 GitLab API 的 Header 安全处理。您可以在工作区的 `.env` 文件或 Secrets 中配置 `GITLAB_PRIVATE_TOKEN`。在需要临时操作时，我们还对 GitLab OAuth 提供完善的独立弹窗授权支持，保障鉴权不会泄露在客户端。",
                "Foresight utilizes industry-standard GitLab headers. You can securely pass private tokens using the GITLAB_PRIVATE_TOKEN secret in your environment, or easily register your own OAuth application via popup flows to safely grant per-session scoping without sharing raw persistent passwords."
              )
            }
          ].map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div key={idx} className="transition-all">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-medium text-xs text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="px-6 pb-5 pt-1 text-[11.5px] leading-relaxed text-zinc-500 font-sans border-t border-zinc-50 bg-zinc-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Minimal Understated Contact / Inquiry Block */}
      <section id="contact" className="border-t border-zinc-300 bg-[#f4f3f0] py-16 px-6 relative">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-zinc-900">{t('联络与反馈', 'Contact & Feedback')}</h2>
            <p className="text-[11px] text-zinc-500">
              {t('在使用或对接自建 GitLab 时遇到了问题？请联系服务团队协助您解决。', 'Experiencing difficulties integrating with your custom GitLab instance? Reach out to our team.')}
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4 bg-white p-6 border-2 border-zinc-900 rounded-2xl shadow-[3px_3px_0px_#18181b]">
            {contactSuccess ? (
              <div className="py-8 text-center space-y-2">
                <span className="text-2xl">🎉</span>
                <p className="text-[11.5px] text-emerald-700 font-medium font-sans">
                  {t('感谢您的投递！我们已为您分配客服单并派专人处理。', 'Thank you for your message! A development ticket has been assigned and we will reach out shortly.')}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold font-mono text-zinc-400 block">{t('注册邮箱地址', 'Corporate Email Address')}</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fcfcfb] border border-zinc-300 rounded-lg text-xs placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold font-mono text-zinc-400 block">{t('咨询内容', 'Inquiry Message')}</label>
                  <textarea
                    required
                    rows={3}
                    placeholder={t('请输入你的疑问、需求或对于 Foresight Telemetry 模型的意见...', 'Please describe your inquiry, issue, or suggestions for Foresight Telemetry...')}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fcfcfb] border border-zinc-300 rounded-lg text-xs placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>{t('提交反馈清单', 'Submit Ticket')}</span>
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* Exquisite Subtle Footer */}
      <footer className="bg-zinc-950 font-sans border-t border-zinc-800 py-10 text-center text-[11px] text-zinc-500 space-y-2 relative z-10 select-none">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded-md bg-emerald-500 font-bold text-black flex items-center justify-center text-[10px]">
              F
            </span>
            <span className="font-semibold text-zinc-300 font-display">Foresight EM Portal</span>
          </div>
          <div>
            <span>© 2026 Foresight EM Inc. Powered by Gemini, ADK & GitLab MCP.</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-650">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span>in Bubblegum Labs</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
