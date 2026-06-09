import os
import json
from datetime import datetime, timezone

from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

from .database import generate_id, insert_analysis, insert_recommendation, insert_audit_log

MCP_SERVER_SCRIPT = os.path.join(os.path.dirname(__file__), "gitlab_mcp_server.py")


def _call_mcp_tool(toolset: McpToolset, tool_name: str, **kwargs) -> dict:
    """Call an MCP tool synchronously and parse JSON result."""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(toolset.call_tool(tool_name, kwargs))
        text = result.content[0].text if result.content else "{}"
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return {"error": "Non-JSON response from MCP tool", "raw": text}
    finally:
        loop.close()


def run_analysis(project_id: str, token: str = "", mode: str = "mcp", repo_id: str = None) -> dict:
    effective_token = token
    if mode == "mcp" and not effective_token:
        effective_token = os.getenv("GITLAB_PRIVATE_TOKEN", "")

    conn_params = StdioConnectionParams(
        server_params=StdioServerParameters(
            command="python3",
            args=[MCP_SERVER_SCRIPT],
        ),
        timeout=30,
    )
    toolset = McpToolset(connection_params=conn_params)

    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # 1. Fetch project
        proj = _call_mcp_tool(toolset, "fetch_project", project_id=project_id, token=effective_token)

        # 2. Fetch all issues
        issues_raw = _call_mcp_tool(toolset, "list_all_issues", project_id=project_id, token=effective_token)
        issues = issues_raw if isinstance(issues_raw, list) else []

        # 3. Fetch MRs
        mrs_opened = _call_mcp_tool(toolset, "list_merge_requests", project_id=project_id, token=effective_token, state="opened")
        mrs_merged = _call_mcp_tool(toolset, "list_merge_requests", project_id=project_id, token=effective_token, state="merged")
        mrs_opened_list = mrs_opened if isinstance(mrs_opened, list) else []
        mrs_merged_list = mrs_merged if isinstance(mrs_merged, list) else []
        all_mrs = mrs_opened_list + mrs_merged_list

        # 4. Fetch pipelines
        pipelines_raw = _call_mcp_tool(toolset, "list_pipelines", project_id=project_id, token=effective_token)
        pipelines = pipelines_raw if isinstance(pipelines_raw, list) else []

        # 5. Fetch commits
        commits_raw = _call_mcp_tool(toolset, "list_commits", project_id=project_id, token=effective_token)
        commits = commits_raw if isinstance(commits_raw, list) else []

    finally:
        loop.close()

    # ── Calculate stats ──────────────────────────────────
    total_issues = len(issues)
    open_issues = len([i for i in issues if i.get("state") in ("opened", "open", "reopened")])
    closed_count = total_issues - open_issues

    total_mrs = len(all_mrs)
    open_mrs = len([m for m in all_mrs if m.get("state") in ("opened", "open")])
    merged_count = len([m for m in all_mrs if m.get("state") == "merged"])

    terminal_statuses = ("success", "failed", "canceled", "skipped")
    completed_pipelines = [p for p in pipelines if p.get("status") in terminal_statuses]
    total_pipelines = len(completed_pipelines)
    success_pipelines = len([p for p in completed_pipelines if p.get("status") == "success"])
    failed_pipelines = len([p for p in completed_pipelines if p.get("status") == "failed"])
    success_rate = round((success_pipelines / total_pipelines * 100)) if total_pipelines > 0 else 100

    total_commits = len(commits)
    commits_by_author = {}
    for c in commits:
        author = c.get("author_name", "Unknown")
        commits_by_author[author] = commits_by_author.get(author, 0) + 1

    context = {
        "project_id": project_id,
        "project_name": proj.get("name", project_id) if isinstance(proj, dict) else project_id,
        "owner": proj.get("namespace", project_id) if isinstance(proj, dict) else "",
        "monitored_at": datetime.now(timezone.utc).isoformat(),
        "issues": {"total": total_issues, "open": open_issues, "closed": closed_count},
        "merge_requests": {"total": total_mrs, "open": open_mrs, "merged": merged_count},
        "pipelines": {"total": total_pipelines, "success": success_pipelines, "failed": failed_pipelines, "success_rate": success_rate},
        "commits": {"total": total_commits, "by_author": commits_by_author},
    }

    # ── Analyze health ───────────────────────────────────
    score = round(
        success_rate * 0.4
        + (merged_count / max(total_mrs, 1)) * 40
        + (closed_count / max(total_issues, 1)) * 20
    )
    score = max(0, min(100, score))

    if score >= 90:
        rating = "Excellent"
    elif score >= 75:
        rating = "Good"
    elif score >= 50:
        rating = "Fair"
    else:
        rating = "Poor"

    summary = (
        f"Project health is rated {rating} with a score of {score}%. "
        f"Pipeline stability: {success_rate}% ({total_pipelines} runs). "
        f"Issues: {open_issues} open / {total_issues} total. "
        f"MRs: {open_mrs} open / {total_mrs} total."
    )

    bottlenecks = []
    if success_rate < 85:
        bottlenecks.append({"type": "CI/CD Pipeline Failure Rate", "metric": f"Success Rate: {success_rate}%", "details": f"{failed_pipelines} of {total_pipelines} pipelines failed."})
    if open_mrs > 2:
        bottlenecks.append({"type": "Merge Request Review Latency", "metric": f"{open_mrs} open MRs", "details": "Open merge requests indicate review bottlenecks."})
    if open_issues > 5:
        bottlenecks.append({"type": "Issue Backlog Overload", "metric": f"{open_issues} open issues", "details": "High volume of unresolved issues."})
    if not bottlenecks:
        bottlenecks.append({"type": "Delivery Velocity", "metric": "Normal", "details": "All channels within nominal limits."})

    recommendations = []
    if success_rate < 85:
        recommendations.append({"action": "Stabilize build configurations and fix flaky tests", "impact": "Improves pipeline success rate and developer velocity."})
    if open_mrs > 1:
        recommendations.append({"action": "Establish mandatory daily code reviews", "impact": "Reduces merge request latency."})
    if open_issues > 3:
        recommendations.append({"action": "Perform sprint backlog triage", "impact": "Clears obsolete tickets."})
    if not recommendations:
        recommendations.append({"action": "Maintain current development cadence", "impact": "Preserves stable delivery cycle."})

    risks = []
    if total_commits > 0 and commits_by_author:
        lead = max(commits_by_author, key=commits_by_author.get)
        pct = round(commits_by_author[lead] / total_commits * 100)
        if pct >= 60:
            risks.append({"title": "Extreme Bus Factor Risk", "severity": "high", "description": f"'{lead}' authored {pct}% of commits ({commits_by_author[lead]}/{total_commits})."})
    if success_rate < 70:
        risks.append({"title": "Unstable Deployment Branch", "severity": "high", "description": f"Build failure rate of {100 - success_rate}%."})
    elif success_rate < 85:
        risks.append({"title": "Flaky Build Pipelines", "severity": "medium", "description": f"{failed_pipelines} failed builds."})
    if not risks:
        risks.append({"title": "Low Operational Risk", "severity": "low", "description": "No critical risks detected."})

    health_result = {
        "project_health_score": {"score": score, "rating": rating, "summary": summary},
        "bottlenecks": bottlenecks,
        "sprint_recommendations": recommendations,
        "risk_analysis": risks,
    }

    # ── Create remediation issue via MCP ─────────────────
    try:
        loop2 = asyncio.new_event_loop()
        asyncio.set_event_loop(loop2)
        issue_result = _call_mcp_tool(
            toolset, "create_issue",
            project_id=project_id,
            title="[Foresight-EM-Remediation] Team Performance Improvement Proposal",
            description=json.dumps(health_result, ensure_ascii=False),
            labels="Foresight-EM,Performance-Optimization",
            token=effective_token,
        )
        loop2.close()
    except Exception as mcp_err:
        issue_result = {"status": "error", "error": f"Failed to create issue via MCP: {mcp_err}"}

    # ── Persist results ──────────────────────────────────
    storage_repo_id = repo_id or generate_id("repo")
    analysis_id = generate_id("analysis")
    now = datetime.now(timezone.utc).isoformat()

    insert_analysis({
        "id": analysis_id, "repo_id": storage_repo_id,
        "created_at": now,
        "issue_stats": json.dumps(context["issues"]),
        "mr_stats": json.dumps(context["merge_requests"]),
        "pipeline_stats": json.dumps(context["pipelines"]),
        "commit_stats": json.dumps(context["commits"]),
        "summary": summary, "score": score,
    })

    for rec in recommendations:
        action_text = rec["action"] + " " + rec["impact"]
        rec_type = "commits"
        if any(w in action_text for w in ["pipeline", "ci/cd", "build", "test"]):
            rec_type = "pipeline"
        elif any(w in action_text for w in ["mr", "merge", "review"]):
            rec_type = "mr"
        elif any(w in action_text for w in ["issue", "bug", "ticket", "backlog"]):
            rec_type = "issues"
        insert_recommendation({
            "id": generate_id("rec"), "repo_id": storage_repo_id,
            "analysis_id": analysis_id, "type": rec_type,
            "title": rec["action"], "description": rec["impact"],
            "priority": "medium", "status": "pending", "created_at": now,
        })

    insert_audit_log({
        "project_id": project_id, "mode": mode,
        "health_score": score,
        "action_plan": json.dumps(health_result, ensure_ascii=False),
        "issue_created_at": issue_result.get("web_url", ""),
    })

    return {
        "project_health_score": health_result["project_health_score"],
        "bottlenecks": health_result["bottlenecks"],
        "sprint_recommendations": health_result["sprint_recommendations"],
        "risk_analysis": health_result["risk_analysis"],
        "analysis": {
            "id": analysis_id, "repo_id": storage_repo_id,
            "issue_stats": context["issues"],
            "mr_stats": context["merge_requests"],
            "pipeline_stats": context["pipelines"],
            "commit_stats": context["commits"],
            "summary": summary, "score": score,
        },
        "issue": issue_result,
    }


# ── ADK Agent with MCP Toolset ──────────────────────────

def create_mcp_agent(token: str = "", mode: str = "mcp") -> Agent:
    effective_token = token
    if mode == "mcp" and not effective_token:
        effective_token = os.getenv("GITLAB_PRIVATE_TOKEN", "")

    conn_params = StdioConnectionParams(
        server_params=StdioServerParameters(
            command="python3",
            args=[MCP_SERVER_SCRIPT],
        ),
        timeout=30,
    )

    mcp_toolset = McpToolset(
        connection_params=conn_params,
        tool_name_prefix="gitlab_",
    )

    return Agent(
        name="foresight_em_agent",
        instruction="""You are Foresight EM Agent — an Engineering Manager AI assistant.
You have access to a GitLab MCP server with tools to:
- fetch_project: Get project details
- list_all_issues: List opened and closed issues
- list_merge_requests: List MRs by state
- list_pipelines: List CI/CD pipelines
- list_commits: List repository commits
- create_issue: Create a new issue

Use these tools to gather telemetry data, analyze project health,
and create remediation issues as needed.""",
        tools=[mcp_toolset],
        model="gemini-2.0-flash",
    )
