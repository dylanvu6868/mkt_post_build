"""Tests for the Langfuse trace_request context manager + REST callback handler."""

import pytest
from unittest.mock import patch, MagicMock
from contextvars import ContextVar

import app.core.tracing as tracing
from app.core.tracing import trace_request, current_trace_id, get_langfuse_handler, ENABLED


def test_trace_request_yields_none_when_disabled(monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", False)
    with trace_request("test.trace") as result:
        assert result is None


@patch("app.core.tracing._post")
def test_trace_request_creates_trace_when_enabled(mock_post, monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", True)
    with trace_request("test.trace", user_id=42, session_id="sess1") as trace_id:
        assert trace_id is not None
        assert isinstance(trace_id, str)
        assert current_trace_id.get() == trace_id
    assert current_trace_id.get() is None
    assert mock_post.call_count >= 2


@patch("app.core.tracing._post")
def test_trace_request_passes_metadata(mock_post, monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", True)
    meta = {"tool": "shield", "plan": "pro"}
    with trace_request("lab.shield", user_id=1, metadata=meta):
        pass
    # Find the traces POST call (first call)
    trace_call = mock_post.call_args_list[0]
    assert trace_call[0][0] == "traces"
    sent_data = trace_call[0][1] if len(trace_call[0]) > 1 else trace_call[1].get("json", {})
    assert sent_data.get("metadata") == meta or trace_call[1].get("json", {}).get("metadata") == meta


@patch("app.core.tracing._post")
def test_trace_request_ends_root_span_on_exit(mock_post, monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", True)
    with trace_request("test"):
        pass
    last_call = mock_post.call_args_list[-1]
    assert last_call[0][0] == "observations"
    sent_data = last_call[0][1] if len(last_call[0]) > 1 else last_call[1].get("json", {})
    assert "end_time" in sent_data or "end_time" in last_call[1].get("json", {})


@patch("app.core.tracing._post")
def test_trace_request_propagates_contextvar(mock_post, monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", True)
    with trace_request("outer") as tid:
        assert current_trace_id.get() == tid
        # Simulate generate_structured reading it
        assert current_trace_id.get() is not None
    assert current_trace_id.get() is None


def test_get_langfuse_handler_returns_none_without_trace_id():
    handler = get_langfuse_handler(None)
    assert handler is None


@patch("app.core.tracing._post")
def test_get_langfuse_handler_returns_handler_with_trace_id(mock_post, monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", True)
    handler = get_langfuse_handler("test-trace-id")
    assert handler is not None
    assert handler.trace_id == "test-trace-id"


def test_get_langfuse_handler_returns_none_when_disabled(monkeypatch):
    monkeypatch.setattr(tracing, "ENABLED", False)
    handler = get_langfuse_handler("test-trace-id")
    assert handler is None
