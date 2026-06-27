"""Tests for the Langfuse trace_request context manager."""

from unittest.mock import patch, MagicMock

from app.core.tracing import trace_request


def test_trace_request_yields_none_when_langfuse_disabled():
    import app.core.tracing as tracing
    original = tracing.langfuse_client
    tracing.langfuse_client = None
    try:
        with trace_request("test.trace") as result:
            assert result is None
    finally:
        tracing.langfuse_client = original


@patch("app.core.tracing.langfuse_client")
def test_trace_request_creates_trace_when_enabled(mock_client):
    mock_trace = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_trace)
    mock_cm.__exit__ = MagicMock(return_value=False)
    mock_client.start_as_current_observation.return_value = mock_cm

    with trace_request("test.trace", user_id=42, session_id="sess1") as result:
        assert result is mock_trace

    mock_client.start_as_current_observation.assert_called_once_with(
        as_type="trace",
        name="test.trace",
        user_id="42",
        session_id="sess1",
        metadata={},
    )


@patch("app.core.tracing.langfuse_client")
def test_trace_request_passes_metadata(mock_client):
    mock_trace = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_trace)
    mock_cm.__exit__ = MagicMock(return_value=False)
    mock_client.start_as_current_observation.return_value = mock_cm

    meta = {"tool": "shield", "plan": "pro"}
    with trace_request("lab.shield", user_id=1, metadata=meta):
        pass

    call = mock_client.start_as_current_observation.call_args
    assert call[1]["metadata"] == meta


@patch("app.core.tracing.langfuse_client")
def test_trace_request_handles_none_user_id(mock_client):
    mock_trace = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_trace)
    mock_cm.__exit__ = MagicMock(return_value=False)
    mock_client.start_as_current_observation.return_value = mock_cm

    with trace_request("test", user_id=None):
        pass

    call = mock_client.start_as_current_observation.call_args
    assert call[1]["user_id"] is None
