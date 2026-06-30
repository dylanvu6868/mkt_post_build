import json
from unittest.mock import patch, AsyncMock

from app.agents.guard import GuardResult

_QUICKPOST_CONTENT = (
    "[QUICKPOST:facebook_post]\n"
    "🔥 Bạn có đang gặp vấn đề này?\n\n"
    "Nỗi đau của khách hàng ở đây. Giải pháp là sản phẩm của bạn.\n\n"
    "👇 CTA\n\n"
    "Mua ngay hôm nay!\n\n"
    "#sale #marketing"
)


async def _fake_stream_llm(chat_messages, user_id=None, conversation_id=None):
    for ch in _QUICKPOST_CONTENT:
        yield f"data: {json.dumps({'type': 'token', 'content': ch})}\n\n"
    yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': ['a', 'b', 'c', 'd']})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': _QUICKPOST_CONTENT})}\n\n"


async def _register_and_conv(client, email="qp@example.com"):
    reg = await client.post(
        "/auth/register", json={"name": "U", "email": email, "password": "secret123"}
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    conv = await client.post("/conversations", json={"title": "New conversation"}, headers=headers)
    return headers, conv.json()["id"]


@patch("app.api.chat.provider_available", return_value=True)
@patch("app.api.chat.run_guard_agent", new_callable=AsyncMock)
@patch("app.api.chat._stream_llm", side_effect=_fake_stream_llm)
@patch("app.rag.qdrant_store.retrieve_by_conversation", return_value=[])
@patch("app.rag.qdrant_store.retrieve", return_value=[])
@patch("app.rag.embeddings.embed_query", return_value=[0.1] * 384)
@patch("app.rag.embeddings.sparse_embed_query", return_value={})
async def test_send_message_quickpost_persists_and_embeds_result(
    mock_sparse, mock_embed, mock_retrieve, mock_retrieve_conv, mock_stream, mock_guard, mock_avail, client
):
    mock_guard.return_value = GuardResult(is_safe=True, reason="", category="safe")
    headers, conv_id = await _register_and_conv(client)

    resp = await client.post(
        f"/chat/{conv_id}/send",
        json={"content": "Viết bài facebook cho khóa học online giá 999k"},
        headers=headers,
    )
    assert resp.status_code == 200

    body = resp.text
    done_lines = [line for line in body.split("\n") if line.startswith("data: ") and '"type": "done"' in line]
    assert done_lines, "no done event found in SSE response"
    done_data = json.loads(done_lines[-1][len("data: "):])
    assert done_data["quick_result"]["content_type"] == "facebook_post"
    assert "Mua ngay" in done_data["quick_result"]["result"]["draft"]["cta"]

    history = await client.get("/conversations/" + str(conv_id) + "/messages", headers=headers)
    msgs = history.json()
    assistant_msgs = [m for m in msgs if m["role"] == "assistant"]
    assert assistant_msgs
    assert assistant_msgs[-1]["metadata_json"]["_contentType"] == "facebook_post"
