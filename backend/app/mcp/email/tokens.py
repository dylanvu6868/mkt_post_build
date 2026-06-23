import base64
import hashlib
import hmac

from app.core.config import settings


def _secret() -> bytes:
    return settings.jwt_secret.encode()


def make_unsubscribe_token(contact_id: int) -> str:
    """Return a URL-safe signed token encoding the contact id."""
    payload = str(contact_id).encode()
    sig = hmac.new(_secret(), payload, hashlib.sha256).digest()
    b = base64.urlsafe_b64encode(payload).rstrip(b"=").decode()
    s = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()
    return f"{b}.{s}"


def verify_unsubscribe_token(token: str) -> int | None:
    """Return the contact id if the token is valid and untampered, else None."""
    try:
        b, s = token.split(".", 1)
        payload = base64.urlsafe_b64decode(b + "=" * (-len(b) % 4))
        sig = base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))
        expected = hmac.new(_secret(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        return int(payload.decode())
    except (ValueError, TypeError):
        return None
