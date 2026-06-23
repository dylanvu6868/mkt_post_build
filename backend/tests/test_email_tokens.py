"""
Pure unit tests for the HMAC-signed unsubscribe token helpers.
No DB or HTTP client needed.
"""
import pytest
from app.mcp.email.tokens import make_unsubscribe_token, verify_unsubscribe_token


def test_round_trip_returns_same_contact_id():
    token = make_unsubscribe_token(42)
    assert verify_unsubscribe_token(token) == 42


def test_round_trip_large_id():
    token = make_unsubscribe_token(99999)
    assert verify_unsubscribe_token(token) == 99999


def test_tampered_signature_returns_none():
    token = make_unsubscribe_token(7)
    b, s = token.split(".", 1)
    # Flip the last character of the signature part
    flipped = s[:-1] + ("A" if s[-1] != "A" else "B")
    tampered = f"{b}.{flipped}"
    assert verify_unsubscribe_token(tampered) is None


def test_malformed_token_no_dot_returns_none():
    assert verify_unsubscribe_token("notadottoken") is None


def test_malformed_token_garbage_returns_none():
    assert verify_unsubscribe_token("!!!garbage!!!") is None


def test_malformed_token_empty_returns_none():
    assert verify_unsubscribe_token("") is None


def test_tampered_payload_returns_none():
    """Change the payload (contact_id) while keeping old signature — must fail."""
    token_7 = make_unsubscribe_token(7)
    token_8 = make_unsubscribe_token(8)
    # Swap payload from token_8 with signature from token_7
    b_8 = token_8.split(".", 1)[0]
    s_7 = token_7.split(".", 1)[1]
    hybrid = f"{b_8}.{s_7}"
    assert verify_unsubscribe_token(hybrid) is None
