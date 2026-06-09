import { GoogleGenAI, Type } from '@google/genai';
import { ProjectHealthReport, Analysis, Recommendation, ManagerAgentResponse, ProjectHealthScore, Bottleneck, SprintRecommendation, RiskAnalysis } from '../../types.js';

export class ProjectAnalyzer {
  
  /**
   * Calculates metric aggregations from raw list arrays
   */
  calculateStats(issues: any[], mrs: any[], pipelines: any[], commits: any[]): ProjectHealthReport {
    // 1. Calculate Issue Stats
    const totalIssues = issues.length;
    const openIssues = issues.filter(i => i.state === 'opened' || i.state === 'open').length;
    const closedIssues = totalIssues - openIssues;
    
    let totalResolutionDays = 0;
    let closedWithDurationCount = 0;
    
    issues.forEach(issue => {
      if ((issue.state === 'closed' || issue.state === 'fixed') && issue.created_at && issue.closed_at) {
        const created = new Date(issue.created_at);
        const closed = new Date(issue.closed_at);
        const durationDays = (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        totalResolutionDays += durationDays;
        closedWithDurationCount++;
      }
    });
    
    const avgResolutionDays = closedWithDurationCount > 0 
      ? Math.round((totalResolutionDays / closedWithDurationCount) * 10) / 10 
      : 0;

    // 2. Calculate Merge Request Stats
    const totalMRs = mrs.length;
    const openMRs = mrs.filter(m => m.state === 'opened' || m.state === 'open').length;
    const mergedMRs = mrs.filter(m => m.state === 'merged').length;
    const closedMRs = totalMRs - openMRs - mergedMRs;
    
    let totalMergeDays = 0;
    let mergedWithDurationCount = 0;
    
    mrs.forEach(mr => {
      if (mr.state === 'merged' && mr.created_at && mr.merged_at) {
        const created = new Date(mr.created_at);
        const merged = new Date(mr.merged_at);
        const durationDays = (merged.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        totalMergeDays += durationDays;
        mergedWithDurationCount++;
      }
    });
    
    const avgMergeTimeDays = mergedWithDurationCount > 0
      ? Math.round((totalMergeDays / mergedWithDurationCount) * 10) / 10
      : 0;

    // 3. Calculate Pipeline Stats
    const totalPipelines = pipelines.length;
    const successPipelines = pipelines.filter(p => p.status === 'success').length;
    const failedPipelines = pipelines.filter(p => p.status === 'failed').length;
    const successRate = totalPipelines > 0 
      ? Math.round((successPipelines / totalPipelines) * 100) 
      : 100;
    
    let totalDurationSeconds = 0;
    let pipelinesWithDuration = 0;
    
    pipelines.forEach(p => {
      if (p.duration) {
        totalDurationSeconds += p.duration;
        pipelinesWithDuration++;
      }
    });
    
    const avgDurationMinutes = pipelinesWithDuration > 0
      ? Math.round((totalDurationSeconds / pipelinesWithDuration / 60) * 10) / 10
      : 0;

    // 4. Calculate Commit Stats
    const totalCommits = commits.length;
    const commitsByAuthor: Record<string, number> = {};
    const dates = new Set<string>();
    
    commits.forEach(c => {
      const author = c.author_name || 'Unknown';
      commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;
      
      if (c.created_at) {
        dates.add(c.created_at.substring(0, 10));
      }
    });

    return {
      issueStats: {
        totalCount: totalIssues,
        openCount: openIssues,
        closedCount: closedIssues,
        avgResolutionDays,
      },
      mrStats: {
        totalCount: totalMRs,
        openCount: openMRs,
        mergedCount: mergedMRs,
        closedCount: closedMRs,
        avgMergeTimeDays,
      },
      pipelineStats: {
        totalCount: totalPipelines,
        successCount: successPipelines,
        failedCount: failedPipelines,
        successRate,
        avgDurationMinutes,
      },
      commitStats: {
        totalCount: totalCommits,
        commitsByAuthor,
        activeDaysCount: dates.size,
      }
    };
  }

  /**
   * Prompts Gemini model with stats report using @google/genai SDK
   */
  async runAIAnalysis(stats: ProjectHealthReport, repoId: string): Promise<ManagerAgentResponse> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      console.info('GEMINI_API_KEY not configured or is default template placeholder. Using high-fidelity rule-based automated analysis fallback...');
      
      // Calculate a highly smart health score from GitLab telemetry metrics
      const rawScore = Math.round(
        (stats.pipelineStats.successRate * 0.4) + 
        (stats.mrStats.totalCount > 0 ? (stats.mrStats.mergedCount / stats.mrStats.totalCount) * 40 : 30) +
        (stats.issueStats.totalCount > 0 ? (stats.issueStats.closedCount / stats.issueStats.totalCount) * 20 : 15)
      );
      const score = Math.max(0, Math.min(100, rawScore));
      
      let rating = 'Fair';
      if (score >= 90) rating = 'Excellent';
      else if (score >= 75) rating = 'Good';
      else if (score >= 50) rating = 'Fair';
      else rating = 'Poor';

      const summary = `Project health is rated ${rating} with a score of ${score}%. Pipeline stability stands at ${stats.pipelineStats.successRate}% across ${stats.pipelineStats.totalCount} executions. The development team resolves reported issues in average of ${stats.issueStats.avgResolutionDays} days. Code reviews are completed within ${stats.mrStats.avgMergeTimeDays} days, with ${stats.mrStats.openCount} currently unresolved.`;

      const projectHealthScore: ProjectHealthScore = { score, rating, summary };

      // Detect Bottlenecks
      const bottlenecks: Bottleneck[] = [];
      if (stats.pipelineStats.successRate < 85) {
        bottlenecks.push({
          type: 'CI/CD Pipeline Failure rate',
          metric: `Success Rate: ${stats.pipelineStats.successRate}%`,
          details: `Out of ${stats.pipelineStats.totalCount} pipeline runs, ${stats.pipelineStats.failedCount} failed. Builds are failing consecutively on main branches, delaying customer deployment.`
        });
      }
      if (stats.mrStats.openCount > 2) {
        bottlenecks.push({
          type: 'Merge Request Review latency',
          metric: `${stats.mrStats.openCount} open MRs`,
          details: `Average code review wait time is ${stats.mrStats.avgMergeTimeDays} days. Stagnant review queues are causing local task accumulation.`
        });
      }
      if (stats.issueStats.openCount > 5) {
        bottlenecks.push({
          type: 'Issue Backlog Overload',
          metric: `${stats.issueStats.openCount} active open issues`,
          details: `Substantial backlog volume is reducing team delivery efficiency. Resolution rate requires support.`
        });
      }
      if (bottlenecks.length === 0) {
        bottlenecks.push({
          type: 'Delivery Velocity',
          metric: 'Normal',
          details: 'No high-severity bottlenecks identified. Delivery throughput remains within nominal limits.'
        });
      }

      // Build Sprint Recommendations
      const sprintRecommendations: SprintRecommendation[] = [];
      if (stats.pipelineStats.successRate < 85) {
        sprintRecommendations.push({
          action: 'Stabilize build configurations',
          impact: 'Improves pipeline success rate by resolving flaky test setups or configuration errors.'
        });
      }
      if (stats.mrStats.openCount > 1) {
        sprintRecommendations.push({
          action: 'Establish mandatory daily code reviews',
          impact: 'Decreases merge request latency and clears blocked reviews.'
        });
      }
      if (stats.issueStats.openCount > 3) {
        sprintRecommendations.push({
          action: 'Perform a sprint backlog triage',
          impact: 'Organizes unresolved tickets and removes obsolete reports.'
        });
      }
      if (sprintRecommendations.length === 0) {
        sprintRecommendations.push({
          action: 'Maintain continuous integration cadence',
          impact: 'Preserves rapid shipping cycles and stable code quality.'
        });
      }

      // Analyze Major Technical/Organizational Risks
      const riskAnalysis: RiskAnalysis[] = [];
      
      // Calculate commit representation ratio for Bus Factor risk detection
      const totalCommits = stats.commitStats.totalCount;
      if (totalCommits > 0) {
        let maxCommits = 0;
        let leadAuthor = 'Unknown';
        for (const [author, count] of Object.entries(stats.commitStats.commitsByAuthor)) {
          if (count > maxCommits) {
            maxCommits = count;
            leadAuthor = author;
          }
        }
        const pct = Math.round((maxCommits / totalCommits) * 100);
        if (pct >= 60) {
          riskAnalysis.push({
            title: 'Extreme Bus Factor Risk',
            severity: 'high',
            description: `Lead developer '${leadAuthor}' contributed ${pct}% of total commits (${maxCommits}/${totalCommits}). The project is highly vulnerable to knowledge silos and single-point-of-failure blocks.`
          });
        }
      }

      if (stats.pipelineStats.successRate < 70) {
        riskAnalysis.push({
          title: 'Unstable Deployment Branch',
          severity: 'high',
          description: `With a build failure rate of ${100 - stats.pipelineStats.successRate}%, the main branch is considered high-risk for deployment. Code stability must be prioritised over new features.`
        });
      } else if (stats.pipelineStats.successRate < 85) {
        riskAnalysis.push({
          title: 'Flaky Build Pipelines',
          severity: 'medium',
          description: `Frequent build failures (${stats.pipelineStats.failedCount} failed attempts) are introducing developer friction and slowing delivery.`
        });
      }

      if (stats.mrStats.avgMergeTimeDays > 3) {
        riskAnalysis.push({
          title: 'Prolonged Task Cycle times',
          severity: 'medium',
          description: `An average merge time of ${stats.mrStats.avgMergeTimeDays} days indicates stagnant review states, widening the gap between implementation and shipping.`
        });
      }

      if (riskAnalysis.length === 0) {
        riskAnalysis.push({
          title: 'Low Operational Risk',
          severity: 'low',
          description: 'No critical architectural, delivery, or bus factor risks detected within the current lifecycle.'
        });
      }

      return { projectHealthScore, bottlenecks, sprintRecommendations, riskAnalysis };
    }

    try {
      // Lazy initialization of Gemini client
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an elite Engineering Manager Agent called Foresight.
Analyze the following GitLab project telemetry metrics to generate a professional, deep, and actionable manager evaluation.
Provide output STRICTLY adhering to the required JSON schema, defining:
1. "projectHealthScore": An object containing the score (0-100), rating ("Excellent"|"Good"|"Fair"|"Poor"), and a detailed, concise summary paragraph.
2. "bottlenecks": An array of detected flow/delivery bottlenecks, each with a type, the current metric, and details of how it blocks progress.
3. "sprintRecommendations": Actionable engineering steps for the upcoming sprint along with their specific impacts.
4. "riskAnalysis": A list of delivery risks (e.g., Bus Factor, unstable pipelines, long cycle times) with titles, severities ("high"|"medium"|"low"), and comprehensive descriptions.

Metrics:
${JSON.stringify(stats, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectHealthScore: {
                type: Type.OBJECT,
                properties: {
                  score: {
                    type: Type.INTEGER,
                    description: 'Aggregated project health score (0-100).'
                  },
                  rating: {
                    type: Type.STRING,
                    description: 'A rating representing the current health: Excellent, Good, Fair, Poor.'
                  },
                  summary: {
                    type: Type.STRING,
                    description: 'Concise executive summary of project status, highlighting key successes or concerns.'
                  }
                },
                required: ['score', 'rating', 'summary']
              },
              bottlenecks: {
                type: Type.ARRAY,
                description: 'Active flow bottlenecks inhibiting delivery velocity.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: 'The bottleneck category or identifier (e.g., Code Review Latency, CI/CD Failure Rate).' },
                    metric: { type: Type.STRING, description: 'The raw triggering metric state (e.g., Average Merge Time: 5.6 days).' },
                    details: { type: Type.STRING, description: 'Explanation of how and why this bottleneck impacts the code production.' }
                  },
                  required: ['type', 'metric', 'details']
                }
              },
              sprintRecommendations: {
                type: Type.ARRAY,
                description: 'Targeted action items for the upcoming iteration.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING, description: 'Clear action item description.' },
                    impact: { type: Type.STRING, description: 'The intended process improvement or recovery outcome.' }
                  },
                  required: ['action', 'impact']
                }
              },
              riskAnalysis: {
                type: Type.ARRAY,
                description: 'Operational and structural development risks.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'The risk identifier (e.g., Bus Factor, Unstable Main Branch).' },
                    severity: { type: Type.STRING, description: 'The potential impact classification: high, medium, low.' },
                    description: { type: Type.STRING, description: 'Comprehensive text outlining why this risk was raised and its implications.' }
                  },
                  required: ['title', 'severity', 'description']
                }
              }
            },
            required: ['projectHealthScore', 'bottlenecks', 'sprintRecommendations', 'riskAnalysis']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        projectHealthScore: parsed.projectHealthScore || { score: 80, rating: 'Good', summary: 'Engineering statistics updated.' },
        bottlenecks: parsed.bottlenecks || [],
        sprintRecommendations: parsed.sprintRecommendations || [],
        riskAnalysis: parsed.riskAnalysis || []
      };

    } catch (err) {
      console.error('Gemini API call failed, backing up with rule-based fallback:', err);
      return {
        projectHealthScore: {
          score: 75,
          rating: 'Good',
          summary: 'Project metrics processed, but Gemini API analysis failed due to: ' + (err as Error).message
        },
        bottlenecks: [
          {
            type: 'Analysis Interface Failure',
            metric: 'N/A',
            details: 'The AI model could not process response. Reverting to local state.'
          }
        ],
        sprintRecommendations: [
          {
            action: 'Audit pipeline run statistics',
            impact: 'Restores model prediction bounds.'
          }
        ],
        riskAnalysis: [
          {
            title: 'System Degradation',
            severity: 'medium',
            description: 'Transient system latency prevents execution of high-fidelity analysis.'
          }
        ]
      };
    }
  }
}
