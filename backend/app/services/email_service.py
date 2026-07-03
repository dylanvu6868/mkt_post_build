import asyncio
import logging
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT = 10
RESEND_API_URL = "https://api.resend.com/emails"


class EmailService:
    def __init__(self):
        self.resend_api_key = settings.resend_api_key
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.smtp_from = settings.smtp_from or settings.smtp_username
        self.use_resend = bool(self.resend_api_key)
        self.enabled = self.use_resend or bool(self.smtp_username and self.smtp_password)

    async def _send_resend(self, to: list[str], subject: str, html: str, cc: list[str] = None, bcc: list[str] = None, from_email: str = None, reply_to: str = None) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            payload = {
                "from": from_email or settings.resend_from or "Vitba.ai <onboarding@resend.dev>",
                "to": to,
                "subject": subject,
                "html": html,
            }
            if reply_to:
                payload["reply_to"] = reply_to
            if cc:
                payload["cc"] = cc
            if bcc:
                payload["bcc"] = bcc

            resp = await client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {self.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()

    def _send_smtp(self, msg: MIMEMultipart, smtp_config: dict = None) -> None:
        _original_getaddrinfo = socket.getaddrinfo

        def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
            return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

        socket.getaddrinfo = _ipv4_only
        
        # Use custom config if provided
        host = smtp_config["host"] if smtp_config else self.smtp_host
        port = int(smtp_config["port"]) if smtp_config else self.smtp_port
        username = smtp_config["username"] if smtp_config else self.smtp_username
        password = smtp_config["password"] if smtp_config else self.smtp_password

        try:
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=SMTP_TIMEOUT) as server:
                    server.login(username, password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=SMTP_TIMEOUT) as server:
                    server.starttls()
                    server.login(username, password)
                    server.send_message(msg)
        finally:
            socket.getaddrinfo = _original_getaddrinfo

    async def _send(self, to: list[str], subject: str, html_content: str, cc: list[str] = None, bcc: list[str] = None, smtp_config: dict = None, from_email: str = None, reply_to: str = None) -> None:
        # If smtp_config is provided, we MUST use SMTP, ignoring self.use_resend
        use_smtp = True if smtp_config else not self.use_resend

        if not use_smtp:
            await self._send_resend(to, subject, html_content, cc, bcc, from_email, reply_to)
        else:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            if reply_to:
                msg["Reply-To"] = reply_to
            
            # Determine sender
            sender = from_email
            if not sender:
                sender = smtp_config["from_email"] if (smtp_config and smtp_config.get("from_email")) else self.smtp_from
            msg["From"] = sender
            
            msg["To"] = ", ".join(to)
            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)
                
            msg.attach(MIMEText(html_content, "html"))
            await asyncio.to_thread(self._send_smtp, msg, smtp_config)

    async def send_password_reset_code(self, email: str, code: str) -> bool:
        if not self.enabled:
            logger.warning("Email service not configured, skipping email send")
            return False

        subject = "Mã đặt lại mật khẩu - Vitba.ai"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #FFD700; margin: 0;">Vitba.ai</h2>
                    <p style="color: #666; margin: 5px 0 0;">AI Marketing Platform</p>
                </div>

                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color: #333; margin-top: 0;">Mã đặt lại mật khẩu của bạn</h3>
                    <p style="color: #666;">Chào bạn,</p>
                    <p style="color: #666;">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Vitba.ai của mình. Mã đặt lại mật khẩu của bạn là:</p>

                    <div style="background-color: #FFD700; color: #000; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 5px;">
                        {code}
                    </div>

                    <p style="color: #666;">Mã này sẽ hết hạn sau <strong>15 phút</strong>.</p>
                    <p style="color: #666;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #999; font-size: 12px; margin: 0;">Đây là email tự động, vui lòng không trả lời.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            await self._send([email], subject, html_content)
            logger.info("Password reset email sent successfully to %s (via %s)", email, "resend" if self.use_resend else "smtp")
            return True
        except Exception as e:
            logger.error("Failed to send password reset email to %s: %s", email, e)
            return False

    async def send_email(
        self,
        to: list[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: list[str] | None = None,
        bcc: list[str] | None = None,
        smtp_config: dict | None = None,
        from_email: str | None = None,
        reply_to: str | None = None,
    ) -> bool:
        if not self.enabled and not smtp_config:
            logger.warning("Email service not configured, skipping email send")
            return False

        try:
            await self._send(to, subject, html_content, cc, bcc, smtp_config, from_email, reply_to)
            logger.info("Email sent successfully to %s", to)
            return True
        except Exception as e:
            logger.error("Failed to send email to %s: %s", to, e)
            return False


email_service = EmailService()
