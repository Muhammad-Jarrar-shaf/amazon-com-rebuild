#!/usr/bin/env python3
"""Agent capture hook (8x assignment).

Wired in .claude/settings.json to two Claude Code hook events:
  UserPromptSubmit -> appends a PROMPT entry (payload field `prompt`, verbatim)
  Stop             -> appends a RESPONSE entry (payload field `last_assistant_message`)

Payload fields used (from the Claude Code hooks reference): session_id,
transcript_path, cwd, prompt (UserPromptSubmit), last_assistant_message (Stop).
The payload carries no model field, so the model id is read from the most recent
assistant message in the session transcript (falling back to settings, then "unknown").

Only the prompt and the final response are written to .agent-logs/. No thinking,
tool calls, intermediate messages or raw hook JSON are persisted. The script never
fails a turn: on any error it appends to .claude/hooks/capture-errors.log (outside
.agent-logs/) and exits 0.
"""
import glob
import json
import os
import re
import sys
import traceback
from datetime import datetime, timezone

AUTHOR = "Muhammad-Jarrar-shaf"
PROJECT = "amazon-com-rebuild"
TOOL = "claude-code"


def utc_now():
    n = datetime.now(timezone.utc)
    return n.strftime("%Y-%m-%dT%H:%M:%S.") + "%03dZ" % (n.microsecond // 1000)


def repo_root(payload):
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and os.path.isdir(env):
        return env
    d = payload.get("cwd") or os.getcwd()
    while d != os.path.dirname(d):
        if os.path.isdir(os.path.join(d, ".git")):
            return d
        d = os.path.dirname(d)
    return payload.get("cwd") or os.getcwd()


def read_transcript(path):
    rows = []
    if not path or not os.path.isfile(path):
        return rows
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
    return rows


def last_model(rows):
    for r in reversed(rows):
        if r.get("type") == "assistant":
            m = (r.get("message") or {}).get("model")
            if m and not m.startswith("<"):
                return m
    return None


def settings_model(root):
    for p in (os.path.join(root, ".claude", "settings.local.json"),
              os.path.join(root, ".claude", "settings.json"),
              os.path.expanduser("~/.claude/settings.json")):
        try:
            with open(p, encoding="utf-8") as f:
                m = json.load(f).get("model")
            if m:
                return m
        except (OSError, ValueError):
            pass
    return None


def find_session_file(logdir, session_id):
    hits = glob.glob(os.path.join(logdir, "*_%s.md" % session_id))
    return hits[0] if hits else None


def header(session_id, date, model, first_ts, last_ts):
    return (
        "---\n"
        "session_id: %s\n"
        "date: %s\n"
        "author: %s\n"
        "model: %s\n"
        "tool: %s\n"
        "project: %s\n"
        "total_exchanges: 0\n"
        "first_prompt_time: %s\n"
        "last_prompt_time: %s\n"
        "---\n\n"
        "# Session Log - %s\n\n"
        "Session: `%s` | Project: `%s` | Author: `%s`\n\n"
        "---\n\n"
    ) % (session_id, date, AUTHOR, model, TOOL, PROJECT, first_ts, last_ts,
         date, session_id[:8], PROJECT, AUTHOR)


def set_header(text, key, value):
    return re.sub(r"(?m)^%s: .*$" % key, lambda m: "%s: %s" % (key, value), text, count=1)


def entry(kind, num, session_id, ts, model, body):
    return "[LOG_ENTRY type=%s num=%d session=%s]\ntimestamp: %s\nmodel: %s\n\n%s\n\n\n" % (
        kind, num, session_id[:8], ts, model, body)


def main():
    event = sys.argv[1] if len(sys.argv) > 1 else ""
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}

    session_id = payload.get("session_id")
    if not session_id:
        raise ValueError("payload has no session_id; keys=%s" % sorted(payload))
    root = repo_root(payload)
    logdir = os.path.join(root, ".agent-logs")
    os.makedirs(logdir, exist_ok=True)
    rows = read_transcript(payload.get("transcript_path"))
    path = find_session_file(logdir, session_id)
    ts = utc_now()

    if event == "UserPromptSubmit":
        prompt = payload.get("prompt")
        if prompt is None:
            raise ValueError("no 'prompt' in UserPromptSubmit payload; keys=%s" % sorted(payload))
        model = last_model(rows) or settings_model(root) or "unknown"
        if path is None:
            path = os.path.join(logdir, "%s_%s.md" % (
                datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S"), session_id))
            text = header(session_id, ts[:10], model, ts, ts)
        else:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        num = len(re.findall(r"(?m)^\[LOG_ENTRY type=PROMPT ", text)) + 1
        text = set_header(text, "total_exchanges", num)
        text = set_header(text, "last_prompt_time", ts)
        text += entry("PROMPT", num, session_id, ts, model, prompt)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    elif event == "Stop":
        if path is None:
            raise ValueError("Stop fired with no session log for %s" % session_id)
        response = payload.get("last_assistant_message")
        if response is None:
            raise ValueError("no 'last_assistant_message' in Stop payload; keys=%s" % sorted(payload))
        model = last_model(rows) or settings_model(root) or "unknown"
        with open(path, encoding="utf-8") as f:
            text = f.read()
        num = len(re.findall(r"(?m)^\[LOG_ENTRY type=PROMPT ", text))
        text += entry("RESPONSE", num, session_id, ts, model, response)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    else:
        raise ValueError("unknown event arg: %r" % event)


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        try:
            with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                   "capture-errors.log"), "a", encoding="utf-8") as f:
                f.write("%s %s\n%s\n" % (utc_now(), " ".join(sys.argv[1:]), traceback.format_exc()))
        except Exception:
            pass
    sys.exit(0)
