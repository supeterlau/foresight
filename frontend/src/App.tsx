import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  GitBranch, 
  Layers, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  ShieldAlert, 
  CheckCircle, 
  Sparkles, 
  Code2, 
  Network, 
  Database,
  BarChart4,
  Check,
  TrendingUp,
  X,
  ArrowRight
} from 'lucide-react';

// Import our cohesive Vercel / Linear custom sub-components
import HealthScoreCard from './components/HealthScoreCard';
import RiskDashboard from './components/RiskDashboard';
import SprintPlanner from './components/SprintPlanner';
import ActionRecommendations from './components/ActionRecommendations';
import RepositoryModal from './components/RepositoryModal';
import LandingPage from './components/LandingPage';

import { Repository, Recommendation, ManagerAgentResponse, ProjectHealthScore, RiskAnalysis, Bottleneck, ProjectHealthReport } from './types';

export default function App() {
  // State definitions
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const [currentLanguage, setCurrentLanguage] = useState<'zh' | 'en'>('zh');
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['zh', 'en']);

  const t = (zh: string, en: string) => {
    return currentLanguage === 'zh' ? zh : en;
  };

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
          setSupportedLanguages(data.languages);
          if (data.languages.length === 1) {
            setCurrentLanguage(data.languages[0] as 'zh' | 'en');
          }
        }
      })
      .catch(err => console.error("Could not fetch language configuration:", err));
  }, []);

  const [repositoriesList, setRepositoriesList] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  
  // GitLab OAuth session states
  const [gitlabToken, setGitlabToken] = useState<string>(() => localStorage.getItem('gitlab_oauth_token') || '');
  const [gitlabUser, setGitlabUser] = useState<any>(() => {
    const saved = localStorage.getItem('gitlab_oauth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Intelligence analytical state
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string>('');

  // Listen for GitLab OAuth message from the popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow current origin and preview domains
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        if (token) {
          setGitlabToken(token);
          localStorage.setItem('gitlab_oauth_token', token);
          if (user) {
            setGitlabUser(user);
            localStorage.setItem('gitlab_oauth_user', JSON.stringify(user));
          }
          // Clear previous error and trigger fresh analysis with new credentials
          setErrorStatus('');
          if (selectedRepoId) {
            triggerAnalysis(selectedRepoId, token);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedRepoId, gitlabToken]);

  const handleGitlabConnect = async () => {
    try {
      const originQuery = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/url?origin=${originQuery}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch auth URL');
      }
      const { url } = await res.json();
      
      const width = 640;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'gitlab_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );
      
      if (!popup) {
        setErrorStatus('Popup blocked: Please allow popups for this site to link GitLab.');
      }
    } catch (err: any) {
      setErrorStatus('Failed to start GitLab sync: ' + err.message);
    }
  };

  const handleGitlabDisconnect = () => {
    setGitlabToken('');
    setGitlabUser(null);
    localStorage.removeItem('gitlab_oauth_token');
    localStorage.removeItem('gitlab_oauth_user');
  };
  
  // Real statistical returns from express router
  const [healthScore, setHealthScore] = useState<ProjectHealthScore>({
    score: 82,
    rating: 'Good',
    summary: 'Telemetry processing online. Ready to invoke Foresight Agent diagnostics.'
  });
  const [activeBottlenecks, setActiveBottlenecks] = useState<Bottleneck[]>([]);
  const [activeRecommendations, setActiveRecommendations] = useState<Recommendation[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis[]>([]);
  const [healthStats, setHealthStats] = useState<ProjectHealthReport | undefined>(undefined);

  // Load repositories on startup
  useEffect(() => {
    fetchRepositories();
  }, []);

  // Sync selectedRepo object when selectedId changes
  useEffect(() => {
    if (selectedRepoId) {
      const match = repositoriesList.find(r => r.id === selectedRepoId);
      if (match) {
        setActiveRepo(match);
        // Automatically perform initial analysis or load history for smooth UX
        autoLoadOrTriggerAnalysis(match.id);
      }
    } else {
      setActiveRepo(null);
    }
  }, [selectedRepoId, repositoriesList]);

  // Fetch all tracked projects from sqlite database
  const fetchRepositories = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.repositories) {
        setRepositoriesList(data.repositories);
        if (data.repositories.length > 0 && !selectedRepoId) {
          // Select seeded shopflow project as first default reference
          const shopflowIdx = data.repositories.findIndex((r: any) => r.projectId === 'shopflow');
          if (shopflowIdx !== -1) {
            setSelectedRepoId(data.repositories[shopflowIdx].id);
          } else {
            setSelectedRepoId(data.repositories[0].id);
          }
        }
      }
    } catch (err: any) {
      setErrorStatus('Failed to list repositories: ' + err.message);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleExploreDemo = (repoId: string) => {
    if (repoId) {
      setSelectedRepoId(repoId);
    } else if (repositoriesList.length > 0) {
      setSelectedRepoId(repositoriesList[0].id);
    }
    setView('app');
  };

  // Add new repository to monitor list
  const handleAddRepository = async (newRepo: { name: string; owner: string; gitlabUrl: string; projectId: string }) => {
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRepo)
      });
      const data = await res.json();
      if (res.ok && data.repository) {
        setRepositoriesList(prev => [...prev, data.repository]);
        setSelectedRepoId(data.repository.id);
        setView('app');
      } else {
        throw new Error(data.error || 'Server rejected request');
      }
    } catch (err: any) {
      setErrorStatus('Failed to monitor repository: ' + err.message);
    }
  };

  // Remove tracked repository
  const handleDeleteRepository = async (id: string) => {
    if (!window.confirm('Are you sure you want to stop tracking this repository? This will clear its metric logs.')) {
      return;
    }
    try {
      const res = await fetch(`/api/repositories/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const remaining = repositoriesList.filter(r => r.id !== id);
        setRepositoriesList(remaining);
        if (remaining.length > 0) {
          setSelectedRepoId(remaining[0].id);
        } else {
          setSelectedRepoId('');
          setHealthStats(undefined);
        }
      }
    } catch (err: any) {
      setErrorStatus('Could not delete repository reference: ' + err.message);
    }
  };

  // Auto detect if analysis is in database, otherwise perform initial calculations
  const autoLoadOrTriggerAnalysis = async (repoId: string) => {
    setLoadingAnalysis(true);
    setErrorStatus('');
    try {
      // 1. Fetch historic records
      const historyRes = await fetch(`/api/repositories/${repoId}/analyses`);
      const historyData = await historyRes.json();
      
      // 2. Fetch action lists
      const recRes = await fetch(`/api/repositories/${repoId}/recommendations`);
      const recData = await recRes.json();

      if (historyData.analyses && historyData.analyses.length > 0) {
        const latest = historyData.analyses[0];
        setHealthScore({
          score: latest.score,
          rating: latest.score >= 90 ? 'Excellent' : latest.score >= 75 ? 'Good' : 'Fair',
          summary: latest.summary
        });
        
        const calculatedStats: ProjectHealthReport = {
          issueStats: latest.issueStats,
          mrStats: latest.mrStats,
          pipelineStats: latest.pipelineStats,
          commitStats: latest.commitStats
        };
        setHealthStats(calculatedStats);
        setActiveRecommendations(recData.recommendations || []);

        // Derive bottlenecks and risks dynamically based on historical telemetry values
        reconstructForesightTelemetry(calculatedStats);
        setLoadingAnalysis(false);
      } else {
        // If never analyzed yet, run initial analysis on demand
        await triggerAnalysis(repoId);
      }
    } catch (err: any) {
      console.warn('Failed to autoload database analysis, running live:', err);
      await triggerAnalysis(repoId);
    }
  };

  // Run dynamic analysis calculations via Gemini & Local telemetry
  const triggerAnalysis = async (repoId: string, overrideToken?: string) => {
    setLoadingAnalysis(true);
    setErrorStatus('');
    try {
      const localPrivateToken = localStorage.getItem('gitlab_private_token');
      const activeToken = overrideToken || localPrivateToken || gitlabToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (activeToken) {
        headers['X-GitLab-Token'] = activeToken;
        headers['X-GitLab-Token-Type'] = localPrivateToken ? 'private' : 'oauth';
      }

      const res = await fetch(`/api/repositories/${repoId}/analyze`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      
      if (res.ok && data.projectHealthScore) {
        setHealthScore(data.projectHealthScore);
        setActiveBottlenecks(data.bottlenecks || []);
        setRiskAnalysis(data.riskAnalysis || []);
        
        if (data.analysis) {
          setHealthStats({
            issueStats: data.analysis.issueStats,
            mrStats: data.analysis.mrStats,
            pipelineStats: data.analysis.pipelineStats,
            commitStats: data.analysis.commitStats
          });
        }
        
        setActiveRecommendations(data.recommendations || []);
      } else {
        throw new Error(data.error || 'Foresight Agent analysis rejected.');
      }
    } catch (err: any) {
      setErrorStatus('Foresight analysis execution failed: ' + err.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Re-generate bottlenecks and risks on-the-fly for historical records
  const reconstructForesightTelemetry = (stats: ProjectHealthReport) => {
    // Bottlenecks
    const botList: Bottleneck[] = [];
    if (stats.pipelineStats.successRate < 85) {
      botList.push({
        type: 'CI/CD Pipeline Failure rate',
        metric: `Success Rate: ${stats.pipelineStats.successRate}%`,
        details: `${stats.pipelineStats.failedCount} builds failed consecutively recently.`
      });
    }
    if (stats.mrStats.openCount > 2) {
      botList.push({
        type: 'Merge Request Review latency',
        metric: `${stats.mrStats.openCount} open MRs`,
        details: `Average review wait time currently sits at ${stats.mrStats.avgMergeTimeDays} days.`
      });
    }
    setActiveBottlenecks(botList.length > 0 ? botList : [{
      type: 'Nominal Velocity',
      metric: 'Stable',
      details: 'All delivery channels running smoothly.'
    }]);

    // Risks
    const rList: RiskAnalysis[] = [];
    const totalCommits = stats.commitStats.totalCount;
    if (totalCommits > 0) {
      let maxCommits = 0;
      let leadAuthor = 'Unknown';
      for (const [auth, count] of Object.entries(stats.commitStats.commitsByAuthor)) {
        if (count > maxCommits) {
          maxCommits = count;
          leadAuthor = auth;
        }
      }
      const ratio = Math.round((maxCommits / totalCommits) * 100);
      if (ratio >= 65) {
        rList.push({
          title: 'Extreme Bus Factor Risk',
          severity: 'high',
          description: `'${leadAuthor}' authored ${ratio}% of all active commits. This creates extreme knowledge concentration.`
        });
      }
    }
    if (stats.pipelineStats.successRate < 80) {
      rList.push({
        title: 'Unstable Deployment Branch',
        severity: 'high',
        description: `With a build failure rate of ${100 - stats.pipelineStats.successRate}%, deploying the main branch introduces major stability risks.`
      });
    } else {
      rList.push({
        title: 'Low Operational Risk',
        severity: 'low',
        description: 'No critical architectural, delivery, or bus factor risks detected within the current lifecycle.'
      });
    }
    setRiskAnalysis(rList);
  };

  // Patch recommendations (Status change: 'pending' | 'resolved' | 'dismissed')
  const handleRecommendationStatusChange = async (recId: string, newStatus: "pending" | "resolved" | "dismissed") => {
    if (!activeRepo) return;
    try {
      const res = await fetch(`/api/repositories/${activeRepo.id}/recommendations/${recId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setActiveRecommendations(prev =>
          prev.map(r => r.id === recId ? { ...r, status: newStatus } : r)
        );
      }
    } catch (err: any) {
      setErrorStatus('Failed to update recommendation: ' + err.message);
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans relative selection:bg-zinc-200">
        
        {/* Simple crisp header for Landing Page */}
        <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md border-b border-zinc-200 px-6 py-3.5 shrink-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            
            {/* Logo brand */}
            <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => setView('landing')}>
              <span className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center font-display font-bold text-black text-xs shadow-md shadow-emerald-500/20">
                F
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-none tracking-tight font-display text-zinc-900">
                  Foresight
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5 uppercase">
                  EM Agent Framework
                </span>
              </div>
            </div>

             {/* Right side helper links / action */}
            <div className="flex items-center gap-4">
              {supportedLanguages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentLanguage(prev => prev === 'zh' ? 'en' : 'zh')}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 hover:border-zinc-400 text-zinc-800 text-[11px] font-mono rounded font-semibold transition-all select-none"
                >
                  {currentLanguage === 'zh' ? '🇬🇧 English' : '🇨🇳 中文'}
                </button>
              )}
              <a href="#contact" className="text-xs text-zinc-500 hover:text-zinc-950 transition-colors font-medium">
                {t('联系与反馈', 'Contact & Feedback')}
              </a>
              {repositoriesList.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setView('app')}
                  className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                >
                  <span>{t('进入仪表盘', 'Enter Dashboard')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView('app')}
                  className="px-3.5 py-1.5 border border-zinc-300 hover:border-zinc-900 bg-white text-zinc-900 font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                >
                  <span>{t('立即探索 Demo', 'Explore Demo Now')}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              )}
            </div>
          </div>
        </header>

        <LandingPage 
          onExploreDemo={handleExploreDemo}
          onAddCustomRepo={handleAddRepository}
          repositories={repositoriesList}
          onConnectGitLab={handleGitlabConnect}
          gitlabToken={gitlabToken}
          gitlabUser={gitlabUser}
          onDisconnectGitLab={handleGitlabDisconnect}
          currentLanguage={currentLanguage}
          t={t}
        />
        
        {/* Adding tracked repository popup modal */}
        <RepositoryModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddRepository}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white antialiased">
      
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-[#18181b] px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => setView('landing')} title="返回极简官网首页">
            <span className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center font-display font-bold text-black text-xs shadow-md shadow-emerald-500/20">
              F
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold leading-none tracking-tight font-display text-zinc-100">
                Foresight
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5 uppercase">
                EM Agent Framework
              </span>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="hidden lg:flex items-center gap-6 text-[11px] text-zinc-500 font-mono">
            <div className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-zinc-600" />
              <span>Drizzle DB: OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-zinc-600" />
              <span>GitLab Bridge: Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
              <span>Gemini Model: 2.x</span>
            </div>
          </div>

          {/* Controls button group */}
          <div className="flex items-center gap-2.5">
            {supportedLanguages.length > 1 && (
              <button
                type="button"
                onClick={() => setCurrentLanguage(prev => prev === 'zh' ? 'en' : 'zh')}
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-800 text-zinc-300 hover:text-zinc-150 text-[11.5px] font-mono rounded-md font-semibold transition-all select-none"
              >
                {currentLanguage === 'zh' ? '🇬🇧 English' : '🇨🇳 中文'}
              </button>
            )}

            {gitlabToken ? (
              <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-950/50 px-3 py-1.5 rounded-md text-xs select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-300 font-medium text-[11px]">
                  GitLab: <span className="text-emerald-400 font-mono">{gitlabUser?.username || gitlabUser?.name || t('在线', 'Active')}</span>
                </span>
                <button
                  type="button"
                  onClick={handleGitlabDisconnect}
                  className="text-zinc-500 hover:text-zinc-300 ml-1.5 transition-colors"
                  title="Disconnect GitLab Session"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGitlabConnect}
                className="px-3.5 py-1.5 border border-purple-900/40 bg-purple-950/20 hover:bg-purple-950/40 text-purple-200 hover:text-purple-100 font-medium text-xs rounded-md transition-all flex items-center gap-1.5 select-none"
              >
                <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                <span>Connect GitLab</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setView('landing')}
              className="px-3.5 py-1.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 font-medium text-xs rounded-md transition-all flex items-center gap-1.5 select-none"
            >
              <span>{t('返回官网', 'Back Home')}</span>
            </button>

            <button
               type="button"
               onClick={() => setIsModalOpen(true)}
               className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs rounded-md shadow-lg transition-all flex items-center gap-1.5 select-none"
             >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('添加项目', 'Add Project')}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Repositories List Panel */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10.5px] uppercase font-mono tracking-wider font-semibold">
                Monitored Projects
              </span>
              <span className="text-[10px] font-mono text-zinc-650 bg-zinc-900 px-1.5 py-0.5 rounded">
                {repositoriesList.length}
              </span>
            </div>

            {loadingRepos ? (
              <div className="py-4 text-center text-xs text-zinc-600 font-mono">
                Loading database...
              </div>
            ) : repositoriesList.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 font-sans leading-normal">
                No tracked projects. Create or seed a model repository to get started.
              </div>
            ) : (
              <div className="space-y-1">
                {repositoriesList.map((repo) => {
                  const isSelected = repo.id === selectedRepoId;
                  
                  return (
                    <div
                      key={repo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRepoId(repo.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedRepoId(repo.id);
                        }
                      }}
                      className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center justify-between select-none cursor-pointer ${
                        isSelected 
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-100' 
                          : 'hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-medium truncate">
                          {repo.name}
                        </span>
                        <span className="block text-[10px] text-zinc-650 font-mono truncate lowercase">
                          id: {repo.projectId}
                        </span>
                      </div>
                      
                      {/* Interactive remove trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRepository(repo.id);
                        }}
                        className="text-zinc-650 hover:text-rose-400 p-1 rounded hover:bg-zinc-950 transition-all ml-2"
                        title="Remove tracking"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-950/20 border border-zinc-900/55 rounded-xl space-y-2 text-[11px] text-zinc-500 font-sans leading-relaxed">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold mb-1">
              Foresight Agent System
            </span>
            Our agent runs diagnostic scans directly on the project's issue histories, code review logs, pipelines, and authorization profiles in real-time. Use the dashboard to schedule resolutions and evaluate branch health gains.
          </div>
        </aside>

        {/* Right Side: Primary Active Dashboard View */}
        <section className="flex-1 space-y-6">
          
          {errorStatus && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs rounded-lg font-mono flex items-center justify-between">
              <span>{errorStatus}</span>
              <button onClick={() => setErrorStatus('')} className="text-rose-500 hover:text-rose-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeRepo ? (
            <div className="space-y-6">
              
              {/* Repository banner state */}
              <div className="p-5 bg-gradient-to-r from-zinc-950/90 to-zinc-950/20 border border-zinc-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Active Audit Target</span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-white font-display">
                    {activeRepo.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-mono">
                    <span className="lowercase">organization: {activeRepo.owner}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1 lowercase">
                      <GitBranch className="w-3 h-3 text-zinc-650" />
                      branch: main
                    </span>
                    <span className="text-zinc-700">•</span>
                    <a 
                      href={activeRepo.gitlabUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-zinc-300 flex items-center gap-1 transition-all"
                    >
                      Repository host <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerAnalysis(activeRepo.id)}
                  disabled={loadingAnalysis}
                  className={`relative px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-md shadow-lg transition-all flex items-center gap-1.5 border border-zinc-800 disabled:opacity-50 select-none ${
                    loadingAnalysis ? 'animate-pulse' : ''
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-zinc-900 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                  <span>{loadingAnalysis ? 'Agent Diagnostic Scan...' : 'Trigger AI Audit'}</span>
                </button>
              </div>

              {/* Core Health Score gauge view */}
              <div className={loadingAnalysis ? 'opacity-40 pointer-events-none transition-all' : 'transition-all'}>
                <HealthScoreCard 
                  health={healthScore} 
                  stats={healthStats} 
                />
              </div>

              {/* Grid 2: Active Flow Bottlenecks & Critical alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Active Bottlenecks pane */}
                <div className="lg:col-span-5 bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-300">
                      Flow Bottlenecks
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                      Operational bottlenecks holding back production velocity.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {activeBottlenecks.length === 0 ? (
                      <div className="text-xs text-zinc-500 font-mono py-4">No bottlenecks logged.</div>
                    ) : (
                      activeBottlenecks.map((bot, idx) => (
                        <div key={idx} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-300">
                              {bot.type}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                              {bot.metric}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                            {bot.details}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Historic Telemetry stats table */}
                <div className="lg:col-span-7 bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-300">
                      Telemetry Record Table
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                      Direct raw measurements retrieved from project integration routes.
                    </p>
                  </div>

                  {healthStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      
                      {/* Metric 1 */}
                      <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-1.5 text-center">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Pipelines</span>
                        <span className="text-lg font-bold font-mono text-white block">
                          {healthStats.pipelineStats.totalCount}
                        </span>
                        <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                          {healthStats.pipelineStats.successRate}% OK
                        </span>
                      </div>

                      {/* Metric 2 */}
                      <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-1.5 text-center">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Merge Requests</span>
                        <span className="text-lg font-bold font-mono text-white block">
                          {healthStats.mrStats.totalCount}
                        </span>
                        <span className="text-[9.5px] font-mono text-amber-400 bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded">
                          {healthStats.mrStats.openCount} Open
                        </span>
                      </div>

                      {/* Metric 3 */}
                      <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-1.5 text-center">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Backlog Tickets</span>
                        <span className="text-lg font-bold font-mono text-white block">
                          {healthStats.issueStats.totalCount}
                        </span>
                        <span className="text-[9.5px] font-mono text-purple-400 bg-purple-500/5 border border-purple-500/10 px-1.5 py-0.5 rounded">
                          {healthStats.issueStats.openCount} Active
                        </span>
                      </div>

                      {/* Metric 4 */}
                      <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-1.5 text-center">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Commit Rate</span>
                        <span className="text-lg font-bold font-mono text-white block">
                          {healthStats.commitStats.totalCount}
                        </span>
                        <span className="text-[9.5px] font-mono text-zinc-400 bg-zinc-100/5 border border-zinc-100/10 px-1.5 py-0.5 rounded">
                          {healthStats.commitStats.activeDaysCount} Days
                        </span>
                      </div>

                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-zinc-500 font-mono">No telemetry logs loaded.</div>
                  )}
                </div>

              </div>

              {/* Operational Risk Dashboard components */}
              <div className={loadingAnalysis ? 'opacity-40 pointer-events-none transition-all animate-pulse' : 'transition-all'}>
                <RiskDashboard risks={riskAnalysis} />
              </div>

              {/* Action Recommendations Management card */}
              <div className={loadingAnalysis ? 'opacity-40 pointer-events-none transition-all' : 'transition-all'}>
                <ActionRecommendations 
                  recommendations={activeRecommendations} 
                  onStatusChange={handleRecommendationStatusChange}
                />
              </div>

              {/* Sprint Planner interactive simulator component */}
              <div className={loadingAnalysis ? 'opacity-40 pointer-events-none transition-all' : 'transition-all'}>
                <SprintPlanner 
                  recommendations={activeRecommendations} 
                  activeScore={healthScore.score}
                  onStatusChange={handleRecommendationStatusChange}
                />
              </div>

            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 max-w-xl mx-auto space-y-4">
              <BarChart4 className="w-10 h-10 text-zinc-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">No project selected</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-normal">
                  Select an existing project from the monitored list sidebar to review metrics or click monitor repository.
                </p>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-zinc-900 bg-zinc-950/40 text-center text-[10px] text-zinc-650 font-mono">
        <span>Foresight EM Agent Framework • Powered by Google Gemini and SQLite</span>
      </footer>

      {/* Adding tracked repository popups modal */}
      <RepositoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddRepository}
      />

    </div>
  );
}
