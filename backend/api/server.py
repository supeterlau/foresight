import os
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from urllib.parse import urlencode

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from .database import (
    init_db, list_repositories, get_repository, insert_repository,
    delete_repository, list_analyses, list_recommendations,
    update_recommendation_status, get_repository_by_project_id, generate_id,
)
from .agent import run_analysis

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Foresight EM Agent API", lifespan=lifespan)

origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateRepoRequest(BaseModel):
    name: str = ""
    owner: str = ""
    gitlabUrl: str = "https://gitlab.com"
    projectId: str


class UpdateRecStatusRequest(BaseModel):
    status: str


# ── GitLab OAuth ──────────────────────────────────────────────

@app.get("/api/auth/url")
def auth_url(origin: str = Query("")):
    client_id = os.getenv("GITLAB_CLIENT_ID")
    if not client_id:
        raise HTTPException(500, "OAuth is not configured on this server.")
    clean_origin = origin.rstrip("/")
    redirect_uri = f"{clean_origin}/api/auth/callback/gitlab"
    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "api read_user read_api",
        "state": clean_origin,
    })
    gitlab_url = os.getenv("GITLAB_URL", "https://gitlab.com")
    return {"url": f"{gitlab_url}/oauth/authorize?{params}"}


@app.get("/api/auth/callback/gitlab", response_class=HTMLResponse)
def auth_callback(code: str = Query(""), state: str = Query("")):
    if not code:
        return HTMLResponse("Authorization code missing.", status_code=400)
    clean_origin = state or os.getenv("APP_URL", "")
    redirect_uri = f"{clean_origin}/api/auth/callback/gitlab"
    gitlab_url = os.getenv("GITLAB_URL", "https://gitlab.com")
    client_id = os.getenv("GITLAB_CLIENT_ID")
    client_secret = os.getenv("GITLAB_CLIENT_SECRET")

    import requests as http_requests
    try:
        token_resp = http_requests.post(
            f"{gitlab_url}/oauth/token",
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            timeout=10,
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return HTMLResponse("Token exchange failed: invalid response from provider.", status_code=502)
    except Exception:
        return HTMLResponse("Token exchange failed.", status_code=502)

    user_profile = None
    try:
        user_resp = http_requests.get(
            f"{gitlab_url}/api/v4/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=5,
        )
        if user_resp.ok:
            user_profile = user_resp.json()
    except Exception:
        pass

    return HTMLResponse(f"""<!DOCTYPE html>
<html><head><title>GitLab Auth Success</title>
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#09090b;color:#f4f4f5;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}}
.card{{background:#18181b;border:1px solid #27272a;padding:2rem;border-radius:.75rem}}
h2{{color:#10b981;margin-top:0}} p{{color:#a1a1aa}}
</style></head><body>
<div class="card"><h2>✓ 登录成功</h2><p>GitLab 帐号已成功绑定。正在重新载入，本窗口将自动关闭。</p></div>
<script>
if(window.opener){{window.opener.postMessage({{type:'OAUTH_AUTH_SUCCESS',token:{json.dumps(access_token)},user:{json.dumps(user_profile)}}},'*');
setTimeout(function(){{window.close()}},1200)}}else{{window.location.href='/'}}
</script></body></html>""")


# ── API Endpoints ─────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "Foresight ADK EM Server"}


@app.get("/api/config")
def config():
    languages = os.getenv("LANGUAGES", "zh,en")
    return {
        "languages": [l.strip().lower() for l in languages.split(",") if l.strip()]
    }


@app.get("/api/repositories")
def get_repositories():
    repos = list_repositories()
    return {"repositories": repos}


@app.post("/api/repositories")
def create_repository(req: CreateRepoRequest):
    if not req.projectId.strip():
        raise HTTPException(422, "projectId is required.")
    if not req.gitlabUrl.startswith("http"):
        raise HTTPException(422, "gitlabUrl must be a valid URL.")
    existing = get_repository_by_project_id(req.projectId)
    if existing:
        raise HTTPException(409, "A repository with this projectId already exists.")
    repo = {
        "id": generate_id("repo"),
        "name": req.name.strip() or req.owner.strip() or req.projectId.strip() or "Untitled Repository",
        "owner": req.owner.strip() or "Unknown Owner",
        "gitlab_url": req.gitlabUrl,
        "project_id": req.projectId.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    insert_repository(repo)
    return {"repository": repo}


@app.delete("/api/repositories/{repo_id}")
def remove_repository(repo_id: str):
    repo = get_repository(repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found.")
    delete_repository(repo_id)
    return {"success": True, "message": f"Repository {repo_id} removed."}


class AnalyzeRequest(BaseModel):
    mode: str = "api"
    token: str = ""


class AnalyzeRequest(BaseModel):
    mode: str = "api"
    token: str = ""


@app.post("/api/repositories/{repo_id}/analyze")
def analyze_repository(
    repo_id: str,
    req: AnalyzeRequest = None,
    x_gitlab_token: str = Header(None),
):
    repo = get_repository(repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found.")
    body = req or AnalyzeRequest()
    token = body.token or x_gitlab_token or os.getenv("GITLAB_PRIVATE_TOKEN", "")
    if not token:
        raise HTTPException(401, "GitLab token is required. Provide it via X-GitLab-Token header, request body, or GITLAB_PRIVATE_TOKEN env var.")
    result = run_analysis(repo["project_id"], token, mode=body.mode, repo_id=repo_id)
    return result


@app.get("/api/repositories/{repo_id}/analyses")
def get_analyses(repo_id: str):
    repo = get_repository(repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found.")
    rows = list_analyses(repo_id)
    parsed = []
    for r in rows:
        try:
            r["issue_stats"] = json.loads(r["issue_stats"])
            r["mr_stats"] = json.loads(r["mr_stats"])
            r["pipeline_stats"] = json.loads(r["pipeline_stats"])
            r["commit_stats"] = json.loads(r["commit_stats"])
        except (json.JSONDecodeError, TypeError):
            r["issue_stats"] = {}
            r["mr_stats"] = {}
            r["pipeline_stats"] = []
            r["commit_stats"] = []
        parsed.append(r)
    return {"analyses": parsed}


@app.get("/api/repositories/{repo_id}/recommendations")
def get_recommendations(repo_id: str):
    repo = get_repository(repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found.")
    recs = list_recommendations(repo_id)
    return {"recommendations": recs}


@app.patch("/api/repositories/{repo_id}/recommendations/{rec_id}")
def patch_recommendation(repo_id: str, rec_id: str, req: UpdateRecStatusRequest):
    repo = get_repository(repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found.")
    if req.status not in ("pending", "resolved", "dismissed"):
        raise HTTPException(400, "Invalid status. Must be 'pending', 'resolved', or 'dismissed'.")
    rowcount = update_recommendation_status(rec_id, req.status)
    if rowcount == 0:
        raise HTTPException(404, "Recommendation not found.")
    return {"success": True, "message": f"Recommendation {rec_id} updated to {req.status}."}
