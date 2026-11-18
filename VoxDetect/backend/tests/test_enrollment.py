"""
tests/test_enrollment.py — Speaker enrollment CRUD tests.
"""
from __future__ import annotations

import io
import wave

import pytest


def _make_wav(duration_s: float = 1.0) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * int(16000 * duration_s))
    return buf.getvalue()


WAV = _make_wav()


@pytest.mark.asyncio
async def test_enroll_speaker(client):
    """POST /v1/enroll → 201."""
    resp = await client.post(
        "/v1/enroll",
        files={"file": ("voice.wav", WAV, "audio/wav")},
        data={"speaker_id": "spk_001", "name": "Alice"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["speaker_id"] == "spk_001"
    assert data["display_name"] == "Alice"
    assert data["enrolled"] is True
    assert "created_at" in data
    # Embedding must NEVER appear in the response
    assert "embedding" not in data
    assert "embedding_json" not in data


@pytest.mark.asyncio
async def test_get_enrolled_speaker(client):
    """GET /v1/enroll/{speaker_id} → 200 without embedding."""
    # Enroll first
    await client.post(
        "/v1/enroll",
        files={"file": ("voice.wav", WAV, "audio/wav")},
        data={"speaker_id": "spk_002", "name": "Bob"},
    )

    resp = await client.get("/v1/enroll/spk_002")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["speaker_id"] == "spk_002"
    assert data["display_name"] == "Bob"
    # No embedding in public response
    assert "embedding" not in data
    assert "embedding_json" not in data


@pytest.mark.asyncio
async def test_list_enrolled_speakers_excludes_embeddings(client):
    """GET /v1/enroll returns public profiles, never stored embeddings."""
    for speaker_id, name in (("spk_list_b", "Bob"), ("spk_list_a", "Alice")):
        await client.post(
            "/v1/enroll",
            files={"file": ("voice.wav", WAV, "audio/wav")},
            data={"speaker_id": speaker_id, "name": name},
        )

    resp = await client.get("/v1/enroll", params={"limit": 200})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    speakers = {speaker["speaker_id"]: speaker for speaker in data}
    assert {"spk_list_a", "spk_list_b"} <= speakers.keys()
    for speaker_id in ("spk_list_a", "spk_list_b"):
        assert "embedding" not in speakers[speaker_id]
        assert "embedding_json" not in speakers[speaker_id]


@pytest.mark.asyncio
async def test_get_nonexistent_speaker(client):
    """GET unknown speaker_id → 404."""
    resp = await client.get("/v1/enroll/does_not_exist_xyz")
    assert resp.status_code == 404
    data = resp.json()
    assert data["error"]["code"] == "SPEAKER_NOT_FOUND"


@pytest.mark.asyncio
async def test_delete_enrolled_speaker(client):
    """DELETE /v1/enroll/{speaker_id} → 204."""
    await client.post(
        "/v1/enroll",
        files={"file": ("voice.wav", WAV, "audio/wav")},
        data={"speaker_id": "spk_del", "name": "Delete Me"},
    )
    resp = await client.delete("/v1/enroll/spk_del")
    assert resp.status_code == 204

    # Confirm gone
    get_resp = await client.get("/v1/enroll/spk_del")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_speaker(client):
    """DELETE unknown speaker → 404."""
    resp = await client.delete("/v1/enroll/ghost_speaker")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_enroll_invalid_audio(client):
    """Unsupported file extension → 415."""
    resp = await client.post(
        "/v1/enroll",
        files={"file": ("voice.xyz", b"not audio", "application/octet-stream")},
        data={"speaker_id": "spk_bad", "name": "Bad"},
    )
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_enroll_re_enrollment(client):
    """Re-enrolling same speaker_id overwrites the record."""
    for name in ("Original", "Updated"):
        resp = await client.post(
            "/v1/enroll",
            files={"file": ("voice.wav", WAV, "audio/wav")},
            data={"speaker_id": "spk_update", "name": name},
        )
        assert resp.status_code == 201

    get_resp = await client.get("/v1/enroll/spk_update")
    assert get_resp.json()["display_name"] == "Updated"
