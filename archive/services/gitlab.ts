import { IssueStats, MRStats, PipelineStats, CommitStats } from '../../types.js';

export interface GitLabConfig {
  gitlabUrl?: string;
  token?: string;
  tokenType?: 'private' | 'oauth';
}

export class GitLabService {
  private gitlabUrl: string;
  private token: string | null;
  private tokenType: 'private' | 'oauth';

  constructor(config: GitLabConfig = {}) {
    this.gitlabUrl = config.gitlabUrl || 'https://gitlab.com';
    this.token = config.token || null;
    this.tokenType = config.tokenType || 'private';
  }

  private getHeaders(): Record<string, string> {
    if (!this.token) return {};
    if (this.tokenType === 'oauth') {
      return { 'Authorization': `Bearer ${this.token}` };
    }
    return { 'PRIVATE-TOKEN': this.token };
  }

  private isMockEnabled(): boolean {
    return false;
  }

  /**
   * Fetch issues for a GitLab repository (real repository API call OR mock telemetry fall-back)
   */
  async fetchIssues(projectId: string): Promise<any[]> {
    if (this.token) {
      try {
        const response = await fetch(`${this.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId)}/issues?per_page=100`, {
          headers: this.getHeaders()
        });
        if (response.ok) {
          return await response.json();
        }
        if (!this.isMockEnabled()) {
          throw new Error(`GitLab API error (${response.status}): ${response.statusText}`);
        }
      } catch (err) {
        if (!this.isMockEnabled()) {
          throw err;
        }
        console.warn('Real GitLab API call failed, falling back to mock:', err);
      }
    } else if (!this.isMockEnabled()) {
      throw new Error('GitLab token is missing and mock data is disabled.');
    }

    // High fidelity mock data for full interactive demo potential
    return [
      { id: '1', iid: 1, state: 'opened', title: 'Performance degradation in db scans', created_at: '2026-06-01T12:00:00Z', labels: ['bug', 'severity::high'] },
      { id: '2', iid: 2, state: 'opened', title: 'Add export option for project health metrics', created_at: '2026-06-03T10:00:00Z', labels: ['feature'] },
      { id: '3', iid: 3, state: 'closed', title: 'Fix broken assets in registration funnel', created_at: '2026-05-20T09:00:00Z', closed_at: '2026-05-22T17:00:00Z', labels: ['bug'] },
      { id: '4', iid: 4, state: 'closed', title: 'Setup CI configs for test caching', created_at: '2026-05-24T14:00:00Z', closed_at: '2026-05-28T11:00:00Z', labels: ['ci/cd'] },
      { id: '5', iid: 5, state: 'opened', title: 'Stale container tasks are not pruned', created_at: '2026-05-15T08:00:00Z', labels: ['tech-debt'] },
    ];
  }

  /**
   * Fetch Merge Requests
   */
  async fetchMRs(projectId: string): Promise<any[]> {
    if (this.token) {
      try {
        const response = await fetch(`${this.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests?per_page=100`, {
          headers: this.getHeaders()
        });
        if (response.ok) {
          return await response.json();
        }
        if (!this.isMockEnabled()) {
          throw new Error(`GitLab API error (${response.status}): ${response.statusText}`);
        }
      } catch (err) {
        if (!this.isMockEnabled()) {
          throw err;
        }
        console.warn('Real GitLab API call failed, falling back to mock:', err);
      }
    } else if (!this.isMockEnabled()) {
      throw new Error('GitLab token is missing and mock data is disabled.');
    }

    return [
      { id: '101', iid: 101, state: 'opened', title: 'Feat: Add multi-layer Gemini parsing', created_at: '2026-06-02T12:00:00Z', draft: false, author: { name: 'Alice Smith' } },
      { id: '102', iid: 102, state: 'merged', title: 'Fix: Resolve connection pool exhaustion', created_at: '2026-06-02T12:00:00Z', merged_at: '2026-06-04T12:00:00Z', draft: false, author: { name: 'Bob Jones' } },
      { id: '103', iid: 103, state: 'opened', title: 'WIP: Refactor state stores in memory', created_at: '2026-05-29T11:00:00Z', draft: true, author: { name: 'Alice Smith' } },
      { id: '104', iid: 104, state: 'merged', title: 'Docs: Update pipeline onboarding guide', created_at: '2026-05-10T14:20:00Z', merged_at: '2026-05-11T16:40:00Z', draft: false, author: { name: 'Charlie Miller' } },
    ];
  }

  /**
   * Fetch Pipelines
   */
  async fetchPipelines(projectId: string): Promise<any[]> {
    if (this.token) {
      try {
        const response = await fetch(`${this.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId)}/pipelines?per_page=100`, {
          headers: this.getHeaders()
        });
        if (response.ok) {
          return await response.json();
        }
        if (!this.isMockEnabled()) {
          throw new Error(`GitLab API error (${response.status}): ${response.statusText}`);
        }
      } catch (err) {
        if (!this.isMockEnabled()) {
          throw err;
        }
        console.warn('Real GitLab API call failed, falling back to mock:', err);
      }
    } else if (!this.isMockEnabled()) {
      throw new Error('GitLab token is missing and mock data is disabled.');
    }

    return [
      { id: '201', iid: 50, status: 'success', duration: 300, ref: 'main', updated_at: '2026-06-08T18:00:00Z' },
      { id: '202', iid: 49, status: 'failed', duration: 240, ref: 'main', updated_at: '2026-06-08T14:30:00Z' },
      { id: '203', iid: 48, status: 'success', duration: 280, ref: 'feature/auth', updated_at: '2026-06-07T12:00:00Z' },
      { id: '204', iid: 47, status: 'success', duration: 310, ref: 'main', updated_at: '2026-06-06T15:00:00Z' },
      { id: '205', iid: 46, status: 'success', duration: 290, ref: 'hotfix/leak', updated_at: '2026-06-05T09:00:00Z' },
    ];
  }

  /**
   * Fetch Commits
   */
   async fetchCommits(projectId: string): Promise<any[]> {
    if (this.token) {
      try {
        const response = await fetch(`${this.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits?per_page=100`, {
          headers: this.getHeaders()
        });
        if (response.ok) {
          return await response.json();
        }
        if (!this.isMockEnabled()) {
          throw new Error(`GitLab API error (${response.status}): ${response.statusText}`);
        }
      } catch (err) {
        if (!this.isMockEnabled()) {
          throw err;
        }
        console.warn('Real GitLab API call failed, falling back to mock:', err);
      }
    } else if (!this.isMockEnabled()) {
      throw new Error('GitLab token is missing and mock data is disabled.');
    }

    return [
      { id: '301', author_name: 'Alice Smith', message: 'feat: add mcp gitlab server configuration layer', created_at: '2026-06-08T10:00:00Z' },
      { id: '302', author_name: 'Bob Jones', message: 'fix: check connection pool leakage on terminate', created_at: '2026-06-08T14:00:00Z' },
      { id: '303', author_name: 'Alice Smith', message: 'test: write api and db unit tests', created_at: '2026-06-07T14:00:00Z' },
      { id: '304', author_name: 'Charlie Miller', message: 'docs: refine setup guidelines for mcp-sdk', created_at: '2026-06-05T12:00:00Z' },
      { id: '305', author_name: 'Alice Smith', message: 'feat: init first pipeline configs', created_at: '2026-06-04T09:30:00Z' },
    ];
  }
}
