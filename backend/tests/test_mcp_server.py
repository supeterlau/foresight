import os
import sys
import json
import subprocess

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

MCP_SCRIPT = os.path.join(os.path.dirname(__file__), "..", "api", "gitlab_mcp_server.py")

SMALL_PROJECT = "gitlab-org/gitlab"


def _init_server(proc):
    """Send initialize + initialized notification, read init response."""
    req = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
           "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                      "clientInfo": {"name": "test", "version": "1.0"}}}
    proc.stdin.write(json.dumps(req).encode() + b"\n")
    proc.stdin.flush()
    resp = json.loads(proc.stdout.readline().decode())
    assert resp.get("id") == 1 and "result" in resp
    # Send initialized notification (no response expected)
    proc.stdin.write(json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}).encode() + b"\n")
    proc.stdin.flush()


def _call_tool(proc, name, args, rid=2):
    """Send a tools/call request and return the parsed response."""
    req = {"jsonrpc": "2.0", "id": rid, "method": "tools/call",
           "params": {"name": name, "arguments": args}}
    proc.stdin.write(json.dumps(req).encode() + b"\n")
    proc.stdin.flush()
    # Read the response line
    resp = json.loads(proc.stdout.readline().decode())
    assert resp.get("id") == rid
    return resp


def _list_tools(proc):
    """Send tools/list and return parsed response."""
    req = {"jsonrpc": "2.0", "id": 99, "method": "tools/list"}
    proc.stdin.write(json.dumps(req).encode() + b"\n")
    proc.stdin.flush()
    resp = json.loads(proc.stdout.readline().decode())
    assert resp.get("id") == 99
    return resp


class TestMCPServer:
    """End-to-end MCP server tests.

    Each test method sends ONE request at a time and reads the response
    before the next request.  This avoids Trio's structured-concurrency
    cancellation (which drops responses when stdin is closed while sync
    tool handlers are still running).
    """

    def _proc(self):
        return subprocess.Popen(
            ["python3", MCP_SCRIPT],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )

    def test_initialize_and_tools_list(self):
        proc = self._proc()
        _init_server(proc)
        resp = _list_tools(proc)
        tools = resp["result"]["tools"]
        names = {t["name"] for t in tools}
        expected = {"fetch_project", "list_issues", "list_all_issues",
                    "list_merge_requests", "list_pipelines", "list_commits",
                    "create_issue"}
        assert names == expected, f"Missing: {expected - names}"
        for t in tools:
            assert "inputSchema" in t
            assert "project_id" in t["inputSchema"]["properties"]
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_fetch_project_nonexistent(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "fetch_project", {"project_id": "nonexistent-12345"})
        assert "error" in json.loads(resp["result"]["content"][0]["text"])
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_list_pipelines(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "list_pipelines",
                          {"project_id": SMALL_PROJECT, "per_page": 1})
        data = json.loads(resp["result"]["content"][0]["text"])
        assert isinstance(data, list)
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_list_commits(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "list_commits",
                          {"project_id": SMALL_PROJECT, "per_page": 1})
        data = json.loads(resp["result"]["content"][0]["text"])
        assert isinstance(data, list)
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_list_issues(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "list_issues",
                          {"project_id": SMALL_PROJECT, "per_page": 1})
        data = json.loads(resp["result"]["content"][0]["text"])
        assert isinstance(data, list)
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_list_all_issues(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "list_all_issues",
                          {"project_id": SMALL_PROJECT})
        data = json.loads(resp["result"]["content"][0]["text"])
        assert isinstance(data, list)
        proc.stdin.close()
        proc.wait(timeout=10)

    def test_list_merge_requests(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "list_merge_requests",
                          {"project_id": SMALL_PROJECT, "per_page": 1})
        data = json.loads(resp["result"]["content"][0]["text"])
        assert isinstance(data, list)
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_create_issue_empty_title_returns_error(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "create_issue",
                          {"project_id": SMALL_PROJECT, "title": "", "description": "test"})
        result = json.loads(resp["result"]["content"][0]["text"])
        assert "error" in result
        proc.stdin.close()
        proc.wait(timeout=5)

    def test_nonexistent_tool_returns_error(self):
        proc = self._proc()
        _init_server(proc)
        resp = _call_tool(proc, "no_such_tool", {})
        assert resp.get("result", {}).get("isError") or "error" in resp
        proc.stdin.close()
        proc.wait(timeout=5)
