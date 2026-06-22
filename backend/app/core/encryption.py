import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_KEY_ENV = "MCP_ENCRYPTION_KEY"


def _get_key() -> bytes:
    raw = getattr(settings, "mcp_encryption_key", "") or os.environ.get(_KEY_ENV, "")
    if not raw:
        raw = settings.jwt_secret
    key = raw.encode()[:32].ljust(32, b"\0")
    return key


def encrypt_token(plaintext: str) -> str:
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.urlsafe_b64encode(nonce + ct).decode()


def decrypt_token(ciphertext: str) -> str:
    key = _get_key()
    raw = base64.urlsafe_b64decode(ciphertext)
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode()
