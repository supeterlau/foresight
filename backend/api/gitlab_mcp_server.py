import os
import json
from mcp.server.fastmcp import FastMCP
import requests

GITLAB_URL = os.getenv("GITLAB_URL", "https://gitlab.com").rstrip("/")


def _headers(token: str) -> dict:
    if not token:
        return {}
    if token.startswith("glpat-"):
        return {"PRIVATE-TOKEN": token}
    return {"Authorization": f"Bearer {token}"}


def _get(path: str, token: str, params: dict = None) -> list | dict:
    url = f"{GITLAB_URL}/api/v4/{path.lstrip('/')}"
    resp = requests.get(url, headers=_headers(token), params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def _post(path: str, token: str, data: dict) -> dict:
    url = f"{GITLAB_URL}/api/v4/{path.lstrip('/')}"
    resp = requests.post(url, headers={**_headers(token), "Content-Type": "application/json"}, json=data, timeout=15)
    resp.raise_for_status()
    return resp.json()


mcp = FastMCP("gitlab-mcp-server", instructions="GitLab MCP Server for Foresight EM Agent")


@mcp.tool()
def fetch_project(project_id: str, token: str = "") -> str:
    """Get GitLab project details by project ID or URL-encoded path."""
    try:
        data = _get(f"projects/{requests.utils.quote(project_id, safe='')}", token)
        return json.dumps({"name": data.get("name"), "namespace": data.get("namespace", {}).get("name"), "web_url": data.get("web_url")})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def list_issues(project_id: str, token: str = "", state: str = "opened", per_page: int = 100) -> str:
    """List GitLab issues for a project. Returns JSON array."""
    try:
        all_issues = _get(f"projects/{requests.utils.quote(project_id, safe='')}/issues", token, {"state": state, "per_page": per_page})
        return json.dumps(all_issues)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def list_all_issues(project_id: str, token: str = "") -> str:
    """List ALL GitLab issues (opened + closed) for a project."""
    try:
        opened = _get(f"projects/{requests.utils.quote(project_id, safe='')}/issues", token, {"state": "opened", "per_page": 100})
        closed = _get(f"projects/{requests.utils.quote(project_id, safe='')}/issues", token, {"state": "closed", "per_page": 100})
        return json.dumps(opened + closed)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def list_merge_requests(project_id: str, token: str = "", state: str = "opened", per_page: int = 100) -> str:
    """List GitLab merge requests for a project."""
    try:
        data = _get(f"projects/{requests.utils.quote(project_id, safe='')}/merge_requests", token, {"state": state, "per_page": per_page})
        return json.dumps(data)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def list_pipelines(project_id: str, token: str = "", per_page: int = 100) -> str:
    """List GitLab pipelines for a project."""
    try:
        data = _get(f"projects/{requests.utils.quote(project_id, safe='')}/pipelines", token, {"per_page": per_page})
        return json.dumps(data)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def list_commits(project_id: str, token: str = "", per_page: int = 100) -> str:
    """List GitLab repository commits."""
    try:
        data = _get(f"projects/{requests.utils.quote(project_id, safe='')}/repository/commits", token, {"per_page": per_page})
        return json.dumps(data)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def create_issue(project_id: str, title: str, description: str, labels: str = "", token: str = "") -> str:
    """Create a GitLab issue in the project."""
    try:
        data = {"title": title, "description": description}
        if labels:
            data["labels"] = labels
        result = _post(f"projects/{requests.utils.quote(project_id, safe='')}/issues", token, data)
        return json.dumps({"iid": result.get("iid"), "web_url": result.get("web_url")})
    except Exception as e:
        return json.dumps({"error": str(e)})


if __name__ == "__main__":
    mcp.run(transport="stdio")
