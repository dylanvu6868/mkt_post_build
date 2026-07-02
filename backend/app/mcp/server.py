from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.core.plan_limits import check_daily_email_sends
from app.models.user import User
from app.mcp.email import tools as email_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])


# -- Request schemas --

class SmtpConfig(BaseModel):
    host: str
    port: int
    username: str
    password: str
    from_email: str | None = None

class EmailReq(BaseModel):
    to: list[str]
    cc: list[str] | None = None
    bcc: list[str] | None = None
    subject: str
    html: str
    from_email: str | None = None
    smtp_config: SmtpConfig | None = None

class BatchEmailReq(BaseModel):
    recipients: list[dict] | None = None
    list_id: int | None = None
    subject: str
    html_template: str
    from_email: str | None = None
    smtp_config: SmtpConfig | None = None

class VercelDeployReq(BaseModel):
    name: str
    html: str
    landing_page_id: int


# -- Email endpoints --

@router.post("/email/send")
async def send_email(body: EmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    allowed, used, limit = await check_daily_email_sends(session, user)
    if not allowed:
        raise HTTPException(429, f"Bạn đã đạt giới hạn gửi email trong ngày của gói hiện tại ({limit}/ngày). Vui lòng nâng cấp.")
    try:
        return await email_tools.send_email(
            session, user.id, body.to, body.subject, body.html, 
            body.from_email, cc=body.cc, bcc=body.bcc, smtp_config=body.smtp_config
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Lỗi gửi email: {e}")


@router.post("/email/batch")
async def send_batch(body: BatchEmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    allowed, used, limit = await check_daily_email_sends(session, user)
    if not allowed:
        raise HTTPException(429, f"Bạn đã đạt giới hạn gửi email trong ngày của gói hiện tại ({limit}/ngày). Vui lòng nâng cấp.")

    recipients = body.recipients or []
    if body.list_id is not None:
        from sqlalchemy import select
        from app.models.email_contact import EmailContact
        from app.models.email_list import EmailList, email_list_contacts

        lst = await session.get(EmailList, body.list_id)
        if not lst or lst.user_id != user.id:
            raise HTTPException(404, "Không tìm thấy danh sách liên hệ")
        contacts = (await session.execute(
            select(EmailContact)
            .join(email_list_contacts, email_list_contacts.c.contact_id == EmailContact.id)
            .where(email_list_contacts.c.list_id == body.list_id, EmailContact.user_id == user.id)
        )).scalars().all()
        recipients = [
            {"email": c.email, "name": c.name or ""} for c in contacts
        ] + recipients

    if not recipients:
        raise HTTPException(400, "Danh sách người nhận trống")

    try:
        return await email_tools.send_batch(
            session, user.id, recipients, body.subject, body.html_template,
            body.from_email,
            smtp_config=body.smtp_config.model_dump() if body.smtp_config else None,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/email/stats")
async def email_stats(campaign_id: int | None = None, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.get_email_stats(session, user.id, campaign_id)


# -- Vercel Deployment --

@router.post("/vercel/deploy")
async def deploy_vercel(body: VercelDeployReq, user: User = Depends(get_current_user)):
    from app.core.config import settings
    import httpx
    
    if not settings.vercel_token:
        raise HTTPException(400, "Vercel token is not configured on the server.")

    # Format the project name to be URL safe
    import re
    project_name = re.sub(r'[^a-zA-Z0-9-]', '-', body.name.lower())
    if not project_name:
        project_name = "vitba-landing-page"

    # Limit to 50 chars for project name
    project_name = project_name[:50].strip("-")

    async with httpx.AsyncClient(timeout=30) as client:
        payload = {
            "name": project_name,
            "files": [
                {
                    "file": "index.html",
                    "data": body.html
                }
            ],
            "projectSettings": {
                "framework": None
            }
        }
        
        headers = {
            "Authorization": f"Bearer {settings.vercel_token}",
            "Content-Type": "application/json",
        }

        try:
            resp = await client.post("https://api.vercel.com/v13/deployments", headers=headers, json=payload)
            data = resp.json()
            if resp.status_code >= 400:
                error_msg = data.get("error", {}).get("message", "Failed to deploy to Vercel")
                raise HTTPException(400, error_msg)
                
            deployment_url = data.get("url")
            return {
                "status": "success",
                "deployment_url": f"https://{deployment_url}" if deployment_url else None
            }
        except Exception as e:
            raise HTTPException(500, f"Error communicating with Vercel: {str(e)}")
