import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from api.database import (
    init_db, insert_repository, list_repositories, get_repository,
    delete_repository, insert_analysis, list_analyses,
    insert_recommendation, list_recommendations, update_recommendation_status,
    generate_id,
)


def test_init_db():
    init_db()
    repos = list_repositories()
    assert isinstance(repos, list)


def test_insert_and_list_repositories():
    repo_id = generate_id("repo")
    insert_repository({
        "id": repo_id,
        "name": "test-repo",
        "owner": "tester",
        "gitlab_url": "https://gitlab.com/test/repo",
        "project_id": "12345",
        "created_at": "2026-01-01T00:00:00Z",
    })
    repos = list_repositories()
    ids = [r["id"] for r in repos]
    assert repo_id in ids


def test_get_repository():
    repo_id = generate_id("repo")
    insert_repository({
        "id": repo_id,
        "name": "get-test",
        "owner": "tester",
        "gitlab_url": "https://gitlab.com/test/repo",
        "project_id": "67890",
        "created_at": "2026-01-01T00:00:00Z",
    })
    repo = get_repository(repo_id)
    assert repo is not None
    assert repo["name"] == "get-test"


def test_delete_repository():
    repo_id = generate_id("repo")
    insert_repository({
        "id": repo_id,
        "name": "del-test",
        "owner": "tester",
        "gitlab_url": "https://gitlab.com/test/repo",
        "project_id": "11111",
        "created_at": "2026-01-01T00:00:00Z",
    })
    delete_repository(repo_id)
    repo = get_repository(repo_id)
    assert repo is None


def test_analysis_crud():
    repo_id = generate_id("repo")
    insert_repository({
        "id": repo_id, "name": "a", "owner": "o",
        "gitlab_url": "https://gitlab.com", "project_id": "p",
        "created_at": "2026-01-01T00:00:00Z",
    })
    analysis_id = generate_id("analysis")
    insert_analysis({
        "id": analysis_id,
        "repo_id": repo_id,
        "created_at": "2026-01-01T00:00:00Z",
        "issue_stats": '{"total":5}',
        "mr_stats": '{"total":3}',
        "pipeline_stats": '{"total":10}',
        "commit_stats": '{"total":20}',
        "summary": "Healthy",
        "score": 85,
    })
    analyses = list_analyses(repo_id)
    ids = [a["id"] for a in analyses]
    assert analysis_id in ids


def test_recommendation_crud():
    repo_id = generate_id("repo")
    insert_repository({
        "id": repo_id, "name": "a", "owner": "o",
        "gitlab_url": "https://gitlab.com", "project_id": "p",
        "created_at": "2026-01-01T00:00:00Z",
    })
    analysis_id = generate_id("analysis")
    insert_analysis({
        "id": analysis_id, "repo_id": repo_id,
        "created_at": "2026-01-01T00:00:00Z",
        "issue_stats": "{}", "mr_stats": "{}",
        "pipeline_stats": "{}", "commit_stats": "{}",
        "summary": "OK", "score": 80,
    })
    rec_id = generate_id("rec")
    insert_recommendation({
        "id": rec_id, "repo_id": repo_id,
        "analysis_id": analysis_id,
        "type": "pipeline", "title": "Fix CI",
        "description": "Stabilize builds", "priority": "high",
        "status": "pending", "created_at": "2026-01-01T00:00:00Z",
    })
    recs = list_recommendations(repo_id)
    ids = [r["id"] for r in recs]
    assert rec_id in ids

    update_recommendation_status(rec_id, "resolved")
    updated_recs = list_recommendations(repo_id)
    for r in updated_recs:
        if r["id"] == rec_id:
            assert r["status"] == "resolved"
            break
    else:
        assert False, "Recommendation not found"
