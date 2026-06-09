import { describe, it, expect, vi, beforeEach } from 'vitest';

const API_BASE = '/api';

function mockResponse<T>(status: number, body: T) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('Frontend API Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Config ────────────────────────────────────────────

  it('GET /api/config returns languages', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { languages: ['zh', 'en'] }));
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    expect(data.languages).toContain('zh');
  });

  it('GET /api/config handles server error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(500, { error: 'fail' }));
    const res = await fetch(`${API_BASE}/config`);
    expect(res.ok).toBe(false);
  });

  // ── Auth ──────────────────────────────────────────────

  it('GET /api/auth/url returns OAuth URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(200, { url: 'https://gitlab.com/oauth/authorize?client_id=xxx' })
    );
    const res = await fetch(`${API_BASE}/auth/url?origin=http://localhost:5173`);
    const data = await res.json();
    expect(data.url).toContain('gitlab.com/oauth/authorize');
  });

  it('GET /api/auth/url handles missing client_id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(500, { detail: 'GITLAB_CLIENT_ID not configured' }));
    const res = await fetch(`${API_BASE}/auth/url`);
    expect(res.ok).toBe(false);
  });

  // ── Repositories ──────────────────────────────────────

  it('GET /api/repositories returns list', async () => {
    const repos = [{ id: 'r1', name: 'test', owner: 'me', gitlabUrl: 'https://gitlab.com', projectId: 'p1' }];
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { repositories: repos }));
    const res = await fetch(`${API_BASE}/repositories`);
    const data = await res.json();
    expect(data.repositories).toHaveLength(1);
    expect(data.repositories[0].name).toBe('test');
  });

  it('GET /api/repositories handles empty list', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { repositories: [] }));
    const res = await fetch(`${API_BASE}/repositories`);
    const data = await res.json();
    expect(data.repositories).toEqual([]);
  });

  it('POST /api/repositories creates a new repo', async () => {
    const newRepo = { id: 'r2', name: 'new-proj', owner: 'user', gitlabUrl: 'https://gitlab.com', projectId: 'p2' };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { repository: newRepo }));
    const res = await fetch(`${API_BASE}/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'new-proj', projectId: 'p2' }),
    });
    const data = await res.json();
    expect(data.repository.name).toBe('new-proj');
    expect(data.repository.projectId).toBe('p2');
  });

  it('DELETE /api/repositories/:id removes repo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { success: true }));
    const res = await fetch(`${API_BASE}/repositories/r1`, { method: 'DELETE' });
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('DELETE returns error for non-existent repo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(404, { detail: 'Not found' }));
    const res = await fetch(`${API_BASE}/repositories/no-such-id`, { method: 'DELETE' });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  // ── Analysis ──────────────────────────────────────────

  it('POST /api/repositories/:id/analyze triggers analysis', async () => {
    const analysisResult = {
      project_health_score: { score: 85, rating: 'Good', summary: 'Healthy' },
      bottlenecks: [{ type: 'CI Failure', metric: '70%', details: 'Failing' }],
      sprint_recommendations: [{ action: 'Fix CI', impact: 'Stability' }],
      risk_analysis: [{ title: 'Bus Factor', severity: 'high', description: 'Risk' }],
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, analysisResult));
    const res = await fetch(`${API_BASE}/repositories/r1/analyze`, { method: 'POST' });
    const data = await res.json();
    expect(data.project_health_score.score).toBe(85);
    expect(data.bottlenecks).toHaveLength(1);
    expect(data.sprint_recommendations).toHaveLength(1);
    expect(data.risk_analysis).toHaveLength(1);
  });

  it('POST analyze returns 404 for missing repo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(404, { detail: 'Repository not found.' }));
    const res = await fetch(`${API_BASE}/repositories/bad-id/analyze`, { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('POST analyze with X-GitLab-Token header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { project_health_score: { score: 90 } }));
    const res = await fetch(`${API_BASE}/repositories/r1/analyze`, {
      method: 'POST',
      headers: { 'X-GitLab-Token': 'my-token', 'Content-Type': 'application/json' },
    });
    expect(res.ok).toBe(true);
  });

  // ── Analyses History ──────────────────────────────────

  it('GET /api/repositories/:id/analyses returns history', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(200, { analyses: [{ id: 'a1', score: 90, summary: 'Great' }] })
    );
    const res = await fetch(`${API_BASE}/repositories/r1/analyses`);
    const data = await res.json();
    expect(data.analyses).toHaveLength(1);
    expect(data.analyses[0].score).toBe(90);
  });

  it('GET analyses returns empty array for new repo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { analyses: [] }));
    const res = await fetch(`${API_BASE}/repositories/r1/analyses`);
    const data = await res.json();
    expect(data.analyses).toEqual([]);
  });

  // ── Recommendations ───────────────────────────────────

  it('GET /api/repositories/:id/recommendations returns recs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(200, { recommendations: [{ id: 'rec1', status: 'pending' }] })
    );
    const res = await fetch(`${API_BASE}/repositories/r1/recommendations`);
    const data = await res.json();
    expect(data.recommendations[0].status).toBe('pending');
  });

  it('PATCH recommendation updates status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { success: true }));
    const res = await fetch(`${API_BASE}/repositories/r1/recommendations/rec1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('PATCH rejects invalid status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(400, { detail: 'Invalid status' }));
    const res = await fetch(`${API_BASE}/repositories/r1/recommendations/rec1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });
});
