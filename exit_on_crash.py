#!/usr/bin/env python3
"""
Foresight EM Agent - Supervisor Event Listener

监听 Supervisor 进程状态事件。当任意受管进程进入 FATAL 状态
（超出重启次数后仍然失败）或异常退出时，终止 Supervisor 进程，
从而触发容器退出。Render 检测到容器退出后自动重启整个服务。

Supervisor Event Listener Protocol:
  https://github.com/Supervisor/supervisor/blob/main/supervisor/events.py
"""

import os
import sys
import signal


def write_stdout(data: str) -> None:
    """写入 stdout 并立即刷新（符合 Supervisor 协议要求）"""
    sys.stdout.write(data)
    sys.stdout.flush()


def write_stderr(data: str) -> None:
    """写入 stderr"""
    sys.stderr.write(data)
    sys.stderr.flush()


def parse_header(line: str) -> dict:
    """解析 Supervisor 事件头部行"""
    result = {}
    for part in line.strip().split():
        if ":" in part:
            key, value = part.split(":", 1)
            result[key] = value
    return result


def main() -> None:
    """
    Supervisor Event Listener 主循环

    协议流程:
      1. 写入 READY\\n 表示可以接收事件
      2. Supervisor 发送事件（头部 + 负载）
      3. 处理事件
      4. 写入 RESULT 2\\nOK 确认
      5. 回到步骤 1
    """
    write_stderr(
        "[exit_on_crash] Starting supervisor event listener...\n"
    )

    while True:
        # 通知 Supervisor 已准备好接收事件
        write_stdout("READY\n")

        # 读取事件头部
        header_line = sys.stdin.readline()
        if not header_line:
            write_stderr("[exit_on_crash] EOF on stdin, exiting.\n")
            break

        headers = parse_header(header_line)
        payload_len = int(headers.get("len", 0))

        # 读取事件负载（即使我们不使用它也需要消费掉）
        if payload_len > 0:
            _payload = sys.stdin.read(payload_len)

        # 检查事件类型
        event_name = headers.get("eventname", "")

        if "PROCESS_STATE_FATAL" in event_name:
            write_stderr(
                f"[exit_on_crash] CRITICAL: Process entered FATAL state! "
                f"Event: {event_name}. Exiting supervisor to trigger container restart.\n"
            )
            # 通知 Supervisor 我们已经处理了事件
            write_stdout("RESULT 2\nOK")
            # 终止 Supervisor（PID 1），触发容器退出
            os.kill(1, signal.SIGQUIT)
            sys.exit(0)

        elif "PROCESS_STATE_EXITED" in event_name:
            # 进程退出了（可能是非零退出码）
            # 注意：autorestart=true 会自动尝试重启，但如果持续失败会进入 FATAL
            # 这里我们只记录日志，让 autorestart 先尝试恢复
            write_stderr(
                f"[exit_on_crash] WARNING: Process exited. "
                f"Event: {event_name}. autorestart will attempt recovery.\n"
            )
            write_stdout("RESULT 2\nOK")

        else:
            # 其他事件（RUNNING, STOPPED, BACKOFF 等）忽略
            write_stdout("RESULT 2\nOK")


if __name__ == "__main__":
    main()
