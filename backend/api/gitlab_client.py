import os
import requests


class GitLabClient:
    def __init__(self, gitlab_url: str = None, token: str = None):
        self.gitlab_url = (gitlab_url or os.getenv("GITLAB_URL", "https://gitlab.com")).rstrip("/")
        self.token = token or os.getenv("GITLAB_PRIVATE_TOKEN")
        self.token_type = "oauth" if token else ("pat" if self.token else None)

    def _headers(self) -> dict:
        if not self.token:
            return {}
        if self.token_type == "pat":
            return {"PRIVATE-TOKEN": self.token}
        return {"Authorization": f"Bearer {self.token}"}

    def _get(self, path: str, params: dict = None) -> list | dict:
        url = f"{self.gitlab_url}/api/v4/{path.lstrip('/')}"
        resp = requests.get(url, headers=self._headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, data: dict) -> dict:
        url = f"{self.gitlab_url}/api/v4/{path.lstrip('/')}"
        resp = requests.post(url, headers={**self._headers(), "Content-Type": "application/json"}, json=data, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def fetch_project(self, project_id: str) -> dict:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}")

    def fetch_issues(self, project_id: str, state: str = "opened", per_page: int = 100) -> list:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}/issues", {"state": state, "per_page": per_page})

    def fetch_closed_issues(self, project_id: str, per_page: int = 100) -> list:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}/issues", {"state": "closed", "per_page": per_page})

    def fetch_mrs(self, project_id: str, state: str = "opened", per_page: int = 100) -> list:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}/merge_requests", {"state": state, "per_page": per_page})

    def fetch_merged_mrs(self, project_id: str, per_page: int = 100) -> list:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}/merge_requests", {"state": "merged", "per_page": per_page})

    def fetch_pipelines(self, project_id: str, per_page: int = 100) -> list:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}/pipelines", {"per_page": per_page})

    def fetch_commits(self, project_id: str, per_page: int = 100) -> list:
        return self._get(f"projects/{requests.utils.quote(project_id, safe='')}/repository/commits", {"per_page": per_page})

    def create_issue(self, project_id: str, title: str, description: str, labels: str = None) -> dict:
        data = {"title": title, "description": description}
        if labels:
            data["labels"] = labels
        return self._post(f"projects/{requests.utils.quote(project_id, safe='')}/issues", data)
