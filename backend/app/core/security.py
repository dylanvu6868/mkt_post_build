import logging
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    claims = {"sub": subject, "exp": expire}
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        # Log expiry warning if token expires within 1 day
        exp = payload.get("exp")
        if exp:
            remaining = datetime.fromtimestamp(exp, tz=timezone.utc) - datetime.now(timezone.utc)
            if remaining < timedelta(days=1) and remaining > timedelta(seconds=0):
                logger.info("Token expiring soon: %d hours remaining", remaining.seconds // 3600)
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except JWTError:
        logger.warning("Token decode failed")
        return None
    return payload.get("sub")
