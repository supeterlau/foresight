import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from api.server import app

client = TestClient(app)


class TestOAuth:
    def test_auth_url_returns_url(self):
        resp = client.get("/api/auth/url?origin=http://localhost:5173")
        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data
        assert data["url"].startswith("https://gitlab.com/oauth/authorize?")

    def test_auth_url_missing_client_id(self):
        import os as os_mod
        old = os_mod.environ.get("GITLAB_CLIENT_ID")
        os_mod.environ.pop("GITLAB_CLIENT_ID", None)
        try:
            resp = client.get("/api/auth/url")
            assert resp.status_code == 500
        finally:
            if old:
                os_mod.environ["GITLAB_CLIENT_ID"] = old

    def test_auth_callback_missing_code(self):
        resp = client.get("/api/auth/callback/gitlab")
        assert resp.status_code == 400

    def test_auth_callback_html_response(self):
        resp = client.get("/api/auth/callback/gitlab?code=test123&state=http://localhost:5173")
        # Should fail at token exchange (bad code) but return proper status/html
        assert resp.status_code in (400, 502)


class TestAnalyzeIntegration:
    def test_analyze_nonexistent_repo_returns_404(self):
        resp = client.post("/api/repositories/no-such-repo/analyze")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_analyze_accepts_json_body(self):
        resp = client.post("/api/repositories/dummy/analyze", json={"mode": "api", "token": ""})
        assert resp.status_code == 404  # no such repo, but body parsing should work

    def test_analyze_accepts_header_token(self):
        resp = client.post(
            "/api/repositories/dummy/analyze",
            headers={"X-GitLab-Token": "test-token"},
        )
        assert resp.status_code == 404  # no such repo, but header parsing should work


class TestHealthAndConfig:
    def test_health_returns_healthy(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "healthy"

    def test_config_returns_languages(self):
        resp = client.get("/api/config")
        assert resp.status_code == 200
        body = resp.json()
        assert "languages" in body

    def test_config_filters_empty_language(self):
        resp = client.get("/api/config")
        langs = resp.json()["languages"]
        assert all(l for l in langs)  # no empty strings
