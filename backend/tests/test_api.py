import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from api.server import app
from api.database import get_conn, init_db

client = TestClient(app)


def setup_module():
    init_db()
    conn = get_conn()
    conn.execute("PRAGMA busy_timeout = 10000")
    conn.executescript("DELETE FROM audit_logs; DELETE FROM recommendations;"
                       "DELETE FROM analyses; DELETE FROM repositories;")
    conn.commit()
    conn.close()


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_config():
    resp = client.get("/api/config")
    assert resp.status_code == 200
    assert "languages" in resp.json()


def test_list_repositories_empty():
    resp = client.get("/api/repositories")
    assert resp.status_code == 200
    assert "repositories" in resp.json()


def test_create_repository():
    resp = client.post("/api/repositories", json={
        "name": "test-project",
        "owner": "test-owner",
        "gitlabUrl": "https://gitlab.com",
        "projectId": "test-project-id",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "repository" in data
    assert data["repository"]["name"] == "test-project"
    assert data["repository"]["project_id"] == "test-project-id"


def test_create_and_delete_repository():
    resp = client.post("/api/repositories", json={
        "name": "delete-me",
        "projectId": "del-project",
    })
    repo_id = resp.json()["repository"]["id"]

    resp = client.delete(f"/api/repositories/{repo_id}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_get_recommendations_empty():
    repo_resp = client.post("/api/repositories", json={
        "name": "rec-test", "projectId": "rec-test-project",
    })
    repo_id = repo_resp.json()["repository"]["id"]
    resp = client.get(f"/api/repositories/{repo_id}/recommendations")
    assert resp.status_code == 200
    assert "recommendations" in resp.json()


def test_analyze_missing_repo():
    resp = client.post("/api/repositories/no-such-repo/analyze")
    assert resp.status_code == 404


def test_patch_recommendation_invalid_status():
    repo_resp = client.post("/api/repositories", json={
        "name": "patch-test", "projectId": "patch-test-project",
    })
    repo_id = repo_resp.json()["repository"]["id"]
    resp = client.patch(f"/api/repositories/{repo_id}/recommendations/r1", json={"status": "invalid"})
    assert resp.status_code == 400
