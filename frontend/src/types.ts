export interface Repository {
  id: string; // Internal unique ID (UUID or generated)
  name: string;
  owner: string;
  gitlabUrl: string;
  projectId: string; // GitLab project ID
  createdAt: string;
}

export interface IssueStats {
  totalCount: number;
  openCount: number;
  closedCount: number;
  avgResolutionDays: number;
}

export interface MRStats {
  totalCount: number;
  openCount: number;
  mergedCount: number;
  closedCount: number;
  avgMergeTimeDays: number;
}

export interface PipelineStats {
  totalCount: number;
  successCount: number;
  failedCount: number;
  successRate: number; // 0-100
  avgDurationMinutes: number;
}

export interface CommitStats {
  totalCount: number;
  commitsByAuthor: Record<string, number>;
  activeDaysCount: number;
}

export interface ProjectHealthReport {
  issueStats: IssueStats;
  mrStats: MRStats;
  pipelineStats: PipelineStats;
  commitStats: CommitStats;
}

export interface Analysis {
  id: string;
  repoId: string;
  createdAt: string;
  issueStats: IssueStats;
  mrStats: MRStats;
  pipelineStats: PipelineStats;
  commitStats: CommitStats;
  summary: string;
  score: number; // Health score out of 100
}

export interface ProjectHealthScore {
  score: number;
  rating: string;
  summary: string;
}

export interface Bottleneck {
  type: string;
  metric: string;
  details: string;
}

export interface SprintRecommendation {
  action: string;
  impact: string;
}

export interface RiskAnalysis {
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface ManagerAgentResponse {
  projectHealthScore: ProjectHealthScore;
  bottlenecks: Bottleneck[];
  sprintRecommendations: SprintRecommendation[];
  riskAnalysis: RiskAnalysis[];
}

export interface Recommendation {
  id: string;
  repoId: string;
  analysisId: string;
  type: 'pipeline' | 'issues' | 'mr' | 'commits';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}
