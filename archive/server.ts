import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from '../src/db/index.js';
import { repositories, analyses, recommendations } from '../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { GitLabService } from '../src/services/gitlab.js';
import { ProjectAnalyzer } from '../src/services/analyzer.js';

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middeware
  app.use(express.json());

  // Automatically seed default repositories if none exist
  try {
    const existingRepos = await db.select().from(repositories);
    if (existingRepos.length === 0) {
      console.log('Database exhibits no tracked repositories. Seeding default SaaS structures...');
      await db.insert(repositories).values([
        {
          id: 'repo_demo_1',
          name: 'shopflow-core',
          owner: 'Acme SaaS Corp',
          gitlabUrl: 'https://gitlab.com',
          projectId: 'shopflow',
          createdAt: new Date().toISOString()
        },
        {
          id: 'repo_demo_2',
          name: 'payment-gateway',
          owner: 'Secured Checkout Tech',
          gitlabUrl: 'https://gitlab.com',
          projectId: 'pay-api',
          createdAt: new Date().toISOString()
        }
      ]);
      console.log('Successfully seeded 2 robust mock/demo repositories.');
    }
  } catch (err) {
    console.error('Ignored seeding exception:', err);
  }

  // ==========================================
  // REST API Endpoints
  // ==========================================

  // ==========================================
  // GitLab OAuth Endpoints
  // ==========================================

  // GET /api/auth/url - Generates the GitLab authorize link
  app.get('/api/auth/url', (req, res) => {
    try {
      const clientOrigin = (req.query.origin as string) || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const cleanOrigin = clientOrigin.replace(/\/$/, '');
      const redirectUri = `${cleanOrigin}/api/auth/callback/gitlab`;

      const gitlabUrl = process.env.GITLAB_URL || 'https://gitlab.com';
      const clientId = process.env.GITLAB_CLIENT_ID;

      if (!clientId) {
        res.status(500).json({ error: 'GITLAB_CLIENT_ID is not configured in the server .env' });
        return;
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'api read_user read_api',
        state: cleanOrigin
      });

      res.json({ url: `${gitlabUrl}/oauth/authorize?${params.toString()}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/auth/callback/gitlab - Receives authorization code and exchanges for access token
  app.get(['/api/auth/callback/gitlab', '/api/auth/callback/gitlab/'], async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        res.status(400).send('Authorization code is missing.');
        return;
      }

      const clientOrigin = (state as string) || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const cleanOrigin = clientOrigin.replace(/\/$/, '');
      const redirectUri = `${cleanOrigin}/api/auth/callback/gitlab`;

      const gitlabUrl = process.env.GITLAB_URL || 'https://gitlab.com';

      const tokenResponse = await fetch(`${gitlabUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GITLAB_CLIENT_ID,
          client_secret: process.env.GITLAB_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`GitLab token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;

      // Fetch user profile to return basic user info
      let userProfile = null;
      try {
        const userRes = await fetch(`${gitlabUrl}/api/v4/user`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          userProfile = await userRes.json();
        }
      } catch (userErr) {
        console.warn('Failed to fetch user profile:', userErr);
      }

      // Return small HTML snippet communicating token back and closing popup
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GitLab Auth Success</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #09090b;
                color: #f4f4f5;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                text-align: center;
              }
              .card {
                background: #18181b;
                border: 1px solid #27272a;
                padding: 2rem;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              }
              h2 { color: #10b981; margin-top: 0; }
              p { color: #a1a1aa; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>✓ 登录成功</h2>
              <p>GitLab 帐号已成功绑定。正在重新载入，本窗口将自动关闭。</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  token: ${JSON.stringify(accessToken)},
                  user: ${JSON.stringify(userProfile)}
                }, '*');
                setTimeout(() => {
                  window.close();
                }, 1200);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send(`Authentication error: ${(err as Error).message}`);
    }
  });

  // GET /api/repositories - Lists all monitored repositories
  app.get('/api/repositories', async (req, res) => {
    try {
      const allRepos = await db.select().from(repositories);
      res.json({ repositories: allRepos });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/config - Returns externalized environment and feature flags
  app.get('/api/config', (req, res) => {
    try {
      const languages = process.env.LANGUAGES || process.env.LAUGNAGES || "zh,en";
      res.json({
        languages: languages.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // Python MCP Bridge Endpoints (Google Agent Builder Integration)
  // ==========================================
  
  // POST /api/agent-builder/python-mcp - Forwards tool execution requests directly to Python
  app.post('/api/agent-builder/python-mcp', (req, res) => {
    try {
      const isProxyEnabled = process.env.ENABLE_TS_SERVER_PROXY !== '0' && process.env.ENABLE_TS_SERVER_PROXY?.toLowerCase() !== 'false';
      if (!isProxyEnabled) {
        res.status(403).json({ error: "TypeScript server proxy is disabled (ENABLE_TS_SERVER_PROXY is off)." });
        return;
      }

      const { tool, arguments: toolArgs } = req.body;
      if (!tool) {
        res.status(400).json({ error: "Missing 'tool' property in request body." });
        return;
      }

      const { spawnSync } = require('child_process');
      const payload = JSON.stringify({ tool, arguments: toolArgs || {} });
      
      const child = spawnSync('python3', ['agent.py', '--run-tool', payload], {
        encoding: 'utf-8',
        timeout: 5000
      });

      if (child.error) {
        throw child.error;
      }

      if (child.status !== 0) {
        res.status(500).json({ 
          error: 'Python sub-process returned non-zero exit code.',
          stderr: child.stderr 
        });
        return;
      }
      
      res.json(JSON.parse(child.stdout));
    } catch (err) {
      console.error('Python execution/bridge failed:', err);
      res.status(500).json({
        error: 'Failed to communicate with python mcp sub-engine',
        detail: (err as Error).message
      });
    }
  });

  // GET /api/agent-builder/python-mcp/tools - Lists the schema of all python MCP tools
  app.get('/api/agent-builder/python-mcp/tools', (req, res) => {
    try {
      const isProxyEnabled = process.env.ENABLE_TS_SERVER_PROXY !== '0' && process.env.ENABLE_TS_SERVER_PROXY?.toLowerCase() !== 'false';
      if (!isProxyEnabled) {
        res.status(403).json({ error: "TypeScript server proxy is disabled (ENABLE_TS_SERVER_PROXY is off)." });
        return;
      }

      const { spawnSync } = require('child_process');
      const child = spawnSync('python3', ['agent.py', '--list-tools'], {
        encoding: 'utf-8',
        timeout: 5000
      });

      if (child.error) {
        throw child.error;
      }
      
      res.json(JSON.parse(child.stdout));
    } catch (err) {
      console.error('Python list-tools failed:', err);
      res.status(500).json({
        error: 'Failed to retrieve tools from python mcp sub-engine',
        detail: (err as Error).message
      });
    }
  });

  // POST /api/repositories - Track a new repository
  app.post('/api/repositories', async (req, res) => {
    try {
      const { name, owner, gitlabUrl, projectId } = req.body;
      
      if (!gitlabUrl || !projectId) {
        res.status(400).json({ error: 'Missing requirements: gitlabUrl and projectId are required.' });
        return;
      }

      const newRepo = {
        id: generateId('repo'),
        name: name || owner || 'Unnamed Repo',
        owner: owner || 'Unknown Owner',
        gitlabUrl,
        projectId,
        createdAt: new Date().toISOString(),
      };

      await db.insert(repositories).values(newRepo);
      res.status(201).json({ repository: newRepo });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // DELETE /api/repositories/:id - Remove tracked repository
  app.delete('/api/repositories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.delete(repositories).where(eq(repositories.id, id));
      res.json({ success: true, message: `Repository ${id} removed successfully.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/repositories/:id/analyze - Trigger GitLab fetch and Gemini Health Analysis
  app.post('/api/repositories/:id/analyze', async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Fetch Repo setting
      const repoList = await db.select().from(repositories).where(eq(repositories.id, id));
      if (repoList.length === 0) {
        res.status(404).json({ error: 'Repository not found.' });
        return;
      }
      const repo = repoList[0];

      // 2. Fetch from GitLab API
      const userToken = (req.headers['x-gitlab-token'] as string) || process.env.GITLAB_PRIVATE_TOKEN || undefined;
      const userTokenType = (req.headers['x-gitlab-token-type'] as 'private' | 'oauth') || 'private';

      const gitlabService = new GitLabService({
        gitlabUrl: repo.gitlabUrl,
        token: userToken,
        tokenType: userTokenType
      });

      console.log(`Fetching project telemetry for project: ${repo.projectId}...`);
      const [issues, mrs, pipelines, commits] = await Promise.all([
        gitlabService.fetchIssues(repo.projectId),
        gitlabService.fetchMRs(repo.projectId),
        gitlabService.fetchPipelines(repo.projectId),
        gitlabService.fetchCommits(repo.projectId)
      ]);

      // 3. Run Analysis & calculations
      const analyzer = new ProjectAnalyzer();
      const calculatedReport = analyzer.calculateStats(issues, mrs, pipelines, commits);
      
      console.log('Sending metrics report to Gemini engine...');
      const aiResult = await analyzer.runAIAnalysis(calculatedReport, id);

      // Save Analysis record to sqlite
      const analysisId = generateId('analysis');
      const newAnalysis = {
        id: analysisId,
        repoId: id,
        createdAt: new Date().toISOString(),
        issueStats: JSON.stringify(calculatedReport.issueStats),
        mrStats: JSON.stringify(calculatedReport.mrStats),
        pipelineStats: JSON.stringify(calculatedReport.pipelineStats),
        commitStats: JSON.stringify(calculatedReport.commitStats),
        summary: aiResult.projectHealthScore.summary,
        score: aiResult.projectHealthScore.score,
      };

      await db.insert(analyses).values(newAnalysis);

      // Save Action Recommendations as well
      const savedRecommendations: any[] = [];
      for (const rec of aiResult.sprintRecommendations) {
        // Classify type based on keywords
        let type: 'pipeline' | 'issues' | 'mr' | 'commits' = 'commits';
        const actionLower = rec.action.toLowerCase() + ' ' + rec.impact.toLowerCase();
        if (actionLower.includes('pipeline') || actionLower.includes('ci/cd') || actionLower.includes('build')) {
          type = 'pipeline';
        } else if (actionLower.includes('mr') || actionLower.includes('merge') || actionLower.includes('review')) {
          type = 'mr';
        } else if (actionLower.includes('issue') || actionLower.includes('bug') || actionLower.includes('ticket')) {
          type = 'issues';
        }

        const newRec = {
          id: generateId('rec'),
          repoId: id,
          analysisId,
          type,
          title: rec.action,
          description: rec.impact,
          priority: 'medium' as const,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        };
        await db.insert(recommendations).values(newRec);
        savedRecommendations.push(newRec);
      }

      // Return unified, highly comprehensive JSON response representing our Manager Agent tasks
      res.json({
        projectHealthScore: aiResult.projectHealthScore,
        bottlenecks: aiResult.bottlenecks,
        sprintRecommendations: aiResult.sprintRecommendations,
        riskAnalysis: aiResult.riskAnalysis,
        analysis: {
          ...newAnalysis,
          issueStats: calculatedReport.issueStats,
          mrStats: calculatedReport.mrStats,
          pipelineStats: calculatedReport.pipelineStats,
          commitStats: calculatedReport.commitStats,
        },
        recommendations: savedRecommendations,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/repositories/:id/analyses - Fetch historic analyses
  app.get('/api/repositories/:id/analyses', async (req, res) => {
    try {
      const { id } = req.params;
      const history = await db
        .select()
        .from(analyses)
        .where(eq(analyses.repoId, id))
        .orderBy(desc(analyses.createdAt));
      
      // Parse serialized stats
      const parsedHistory = history.map(item => ({
        ...item,
        issueStats: JSON.parse(item.issueStats),
        mrStats: JSON.parse(item.mrStats),
        pipelineStats: JSON.parse(item.pipelineStats),
        commitStats: JSON.parse(item.commitStats),
      }));

      res.json({ analyses: parsedHistory });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/repositories/:id/recommendations - Fetch recommendations for a repository
  app.get('/api/repositories/:id/recommendations', async (req, res) => {
    try {
      const { id } = req.params;
      const recs = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.repoId, id))
        .orderBy(desc(recommendations.createdAt));
      
      res.json({ recommendations: recs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // PATCH /api/repositories/:id/recommendations/:recId - Modify recommendation status (resolved / dismissed)
  app.patch('/api/repositories/:id/recommendations/:recId', async (req, res) => {
    try {
      const { recId } = req.params;
      const { status } = req.body; // pending, resolved, dismissed

      if (!status || !['pending', 'resolved', 'dismissed'].includes(status)) {
        res.status(400).json({ error: "Invalid status option. Must be 'pending', 'resolved', or 'dismissed'." });
        return;
      }

      await db
        .update(recommendations)
        .set({ status })
        .where(eq(recommendations.id, recId));

      res.json({ success: true, message: `Recommendation ${recId} updated status to ${status}.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // Vite Middleware & SPA Static Router
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production static files server mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running internally on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical: Failed to launch backend on port 3000:", err);
});
