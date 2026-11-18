"""
tests/test_streaming.py — WebSocket /v1/stream tests.
"""
from __future__ import annotations

import asyncio
import io
import json
import wave
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from starlette.testclient import TestClient

from tests.conftest import MOCK_EMBEDDING
from app.services.streaming_service import StreamingSession


def _make_wav(n: int = 8000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * n)
    return buf.getvalue()


WAV_CHUNK = _make_wav(16000 * 2)  # 2 seconds


def test_websocket_connection(test_app):
    """Client can connect and receive a 'ready' frame after sending metadata."""
    client = TestClient(test_app)
    with client.websocket_connect("/v1/stream") as ws:
        # Send metadata
        ws.send_text(json.dumps({"org": "enterprise"}))

        # Receive ready frame
        data = ws.receive_json()
        assert data["type"] == "ready"
        assert "connection_id" in data


def test_websocket_invalid_metadata(test_app):
    """Invalid metadata frame → error response, connection stays open."""
    client = TestClient(test_app)
    with client.websocket_connect("/v1/stream") as ws:
        # Send broken JSON
        ws.send_text("not valid json {{{")
        data = ws.receive_json()
        assert data["type"] == "error"
        assert data["code"] == "INVALID_METADATA"


@pytest.mark.asyncio
async def test_stream_metadata_loads_enrolled_embedding(test_app, client):
    """Selected enrolled speaker embeddings are added to the ML context."""
    enrollment = await client.post(
        "/v1/enroll",
        files={"file": ("voice.wav", WAV_CHUNK, "audio/wav")},
        data={"speaker_id": "stream_speaker", "name": "Stream Speaker"},
    )
    assert enrollment.status_code == 201, enrollment.text

    import app.db.database as db_module

    websocket = AsyncMock()
    async with db_module._session_factory() as session:
        stream = StreamingSession(
            websocket,
            test_app.state.ml_service,
            test_app.state.org_service,
            session,
        )

        await stream._handle_text_frame(
            json.dumps({"org": "enterprise", "enrolled_speaker_id": "stream_speaker"})
        )

        assert stream._ml_context.get("enrolled_embedding") is not None, (
            stream._metadata,
            websocket.send_text.call_args,
        )
        assert stream._ml_context["enrolled_embedding"] == MOCK_EMBEDDING
    websocket.send_text.assert_awaited_once()


def test_rolling_risk_logic():
    """Rolling window correctly smooths risk scores."""
    from collections import deque
    import statistics

    window: deque[float] = deque(maxlen=5)

    scores = [80.0, 20.0, 90.0, 15.0, 85.0]
    rolling = []
    for s in scores:
        window.append(s)
        rolling.append(statistics.median(window))

    # Values should be smoother than raw
    raw_range = max(scores) - min(scores)
    roll_range = max(rolling) - min(rolling)
    assert roll_range <= raw_range


def test_streaming_service_handles_ml_error(test_app, monkeypatch):
    """MLService error for a chunk → error frame sent, connection continues."""
    from app.services.ml_service import MLServiceError

    original = test_app.state.ml_service._sync_analyze_bytes
    test_app.state.ml_service._sync_analyze_bytes = MagicMock(
        side_effect=MLServiceError("Forced failure")
    )
    monkeypatch.setattr(
        "app.services.streaming_service._webm_opus_to_wav_pcm",
        lambda _webm: WAV_CHUNK,
    )

    client = TestClient(test_app)
    with client.websocket_connect("/v1/stream") as ws:
        ws.send_text(json.dumps({"org": "enterprise"}))
        ready_data = ws.receive_json()
        assert ready_data["type"] == "ready"

        ws.send_bytes(WAV_CHUNK)
        data = ws.receive_json()
        assert data["type"] == "error"
        assert data["code"] == "ML_ERROR"

    test_app.state.ml_service._sync_analyze_bytes = original
