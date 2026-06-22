import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.core.rate_limit import limiter
from app.models.payment import PaymentOrder
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

PLAN_PRICES = {
    "lite": {"monthly": 99000, "yearly": 99000 * 12 * 0.8},
    "pro": {"monthly": 219000, "yearly": 219000 * 12 * 0.8},
    "max": {"monthly": 469000, "yearly": 469000 * 12 * 0.8},
}


def _qr_url(amount: float, transfer_code: str) -> str | None:
    """Build a SePay VietQR image URL the user can scan to auto-fill the transfer."""
    if not (settings.sepay_bank_account and settings.sepay_bank_code):
        return None
    from urllib.parse import urlencode

    query = urlencode(
        {
            "acc": settings.sepay_bank_account,
            "bank": settings.sepay_bank_code,
            "amount": int(amount),
            "des": transfer_code,
        }
    )
    return f"https://qr.sepay.vn/img?{query}"


@router.get("/config")
async def payment_config(user: User = Depends(get_current_user)):
    """Bank account details shown on the checkout page (no secrets)."""
    return {
        "bank_code": settings.sepay_bank_code,
        "bank_name": settings.sepay_bank_name or settings.sepay_bank_code,
        "account_number": settings.sepay_bank_account,
        "account_holder": settings.sepay_account_holder,
        "configured": bool(settings.sepay_bank_account and settings.sepay_bank_code),
    }


class CreateOrderRequest(BaseModel):
    plan: str
    cycle: str = "monthly"
    transfer_code: str


@router.post("/create-order")
@limiter.limit("5/minute")
async def create_order(
    request: Request,
    body: CreateOrderRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if body.cycle not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Invalid cycle")

    existing = (
        await session.execute(
            select(PaymentOrder).where(
                PaymentOrder.transfer_code == body.transfer_code
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Transfer code already exists")

    amount = PLAN_PRICES[body.plan][body.cycle]
    order = PaymentOrder(
        user_id=user.id,
        plan=body.plan,
        cycle=body.cycle,
        amount=amount,
        transfer_code=body.transfer_code,
        status="pending",
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)
    logger.info("Payment order created: user=%s plan=%s code=%s", user.email, body.plan, body.transfer_code)
    return {
        "id": order.id,
        "plan": order.plan,
        "cycle": order.cycle,
        "amount": order.amount,
        "transfer_code": order.transfer_code,
        "status": order.status,
        "qr_url": _qr_url(order.amount, order.transfer_code),
    }


@router.get("/order-status")
@limiter.limit("6/minute")
async def order_status(
    request: Request,
    code: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Polled by the checkout page to detect when the SePay webhook confirms payment."""
    order = (
        await session.execute(
            select(PaymentOrder).where(
                PaymentOrder.transfer_code == code,
                PaymentOrder.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"transfer_code": order.transfer_code, "status": order.status}


@router.post("/sepay-webhook")
@limiter.exempt
async def sepay_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """
    SePay sends POST with transaction data when a bank transfer is received.
    Auth (in order of preference):
      - HMAC-SHA256: headers `X-SePay-Signature: sha256=<hex>` + `X-SePay-Timestamp`,
        signed string is `{timestamp}.{raw_body}` with SEPAY_WEBHOOK_SECRET.
      - API Key: header `Authorization: Apikey <key>`.
    Expected fields: transferAmount, content, id, transferType, gateway, accountNumber
    Docs: https://docs.sepay.vn
    """
    raw_body = await request.body()

    if settings.sepay_webhook_secret:
        signature = request.headers.get("X-SePay-Signature", "")
        timestamp = request.headers.get("X-SePay-Timestamp", "")
        signed = f"{timestamp}.".encode() + raw_body
        expected = "sha256=" + hmac.new(
            settings.sepay_webhook_secret.encode(), signed, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning("SePay webhook: invalid HMAC signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
    elif settings.sepay_api_key:
        auth = request.headers.get("Authorization", "")
        parts = auth.split(" ", 1)
        if len(parts) != 2 or parts[0] != "Apikey" or parts[1] != settings.sepay_api_key:
            logger.warning("SePay webhook: invalid API key")
            raise HTTPException(status_code=401, detail="Invalid API Key")

    body = json.loads(raw_body or b"{}")
    logger.info("SePay webhook received: gateway=%s account=%s amount=%s",
                body.get("gateway"), body.get("accountNumber"), body.get("transferAmount"))
    
    content = (body.get("content") or body.get("code") or "").strip().upper()
    amount = body.get("transferAmount") or 0
    transaction_id = str(body.get("id", ""))
    transfer_type = body.get("transferType", "")

    if transfer_type != "in":
        return {"success": True, "message": "Ignored outgoing transfer"}

    if not content:
        logger.warning("SePay webhook: empty content")
        return {"success": False, "message": "No content"}

    # Extract transfer_code from content (first word before space)
    transfer_code = content.split(" ")[0] if content else ""
    if not transfer_code:
        logger.warning("SePay webhook: could not extract transfer_code from content=%s", content)
        return {"success": False, "message": "Invalid transfer code"}

    # Idempotency check: prevent duplicate transaction processing
    existing_order = (
        await session.execute(
            select(PaymentOrder).where(
                PaymentOrder.sepay_transaction_id == transaction_id
            )
        )
    ).scalar_one_or_none()
    if existing_order:
        logger.info("SePay webhook: duplicate transaction_id=%s, order_id=%s already processed", transaction_id, existing_order.id)
        return {"success": True, "message": "Transaction already processed"}

    order = (
        await session.execute(
            select(PaymentOrder).where(
                PaymentOrder.transfer_code == transfer_code,
                PaymentOrder.status == "pending",
            )
        )
    ).scalar_one_or_none()

    if not order:
        logger.warning("SePay webhook: no pending order for transfer_code=%s (content=%s)", transfer_code, content)
        return {"success": False, "message": "Order not found"}

    if float(amount) < order.amount:
        logger.warning("SePay webhook: amount mismatch transfer_code=%s expected=%s got=%s", transfer_code, order.amount, amount)
        return {"success": False, "message": "Amount mismatch"}

    now = datetime.now(timezone.utc)
    order.status = "paid"
    order.sepay_transaction_id = transaction_id
    order.confirmed_at = now

    user = await session.get(User, order.user_id)
    if user:
        user.plan = order.plan
        if order.cycle == "yearly":
            user.plan_expires_at = now + timedelta(days=365)
        else:
            user.plan_expires_at = now + timedelta(days=30)
        logger.info("Plan upgraded: user=%s plan=%s expires=%s via SePay", user.email, user.plan, user.plan_expires_at)

    await session.commit()
    return {"success": True, "message": "Payment confirmed, plan upgraded"}


@router.get("/my-orders")
async def my_orders(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(PaymentOrder)
        .where(PaymentOrder.user_id == user.id)
        .order_by(PaymentOrder.created_at.desc())
        .limit(20)
    )
    orders = result.scalars().all()
    return [
        {
            "id": o.id,
            "plan": o.plan,
            "cycle": o.cycle,
            "amount": o.amount,
            "transfer_code": o.transfer_code,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "confirmed_at": o.confirmed_at.isoformat() if o.confirmed_at else None,
        }
        for o in orders
    ]
