"""Sends email from the office Gmail box (SMTP with a Google app password)."""

import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.config import get_settings

SENDER_NAME = "RE/MAX טאבו נכסים"


def email_configured() -> bool:
    s = get_settings()
    return bool(s.gmail_user and s.gmail_app_password)


def send_email(to: str, subject: str, html: str, text: str) -> None:
    """Raises on failure, so the caller can leave the notification marked as not emailed."""
    s = get_settings()
    msg = EmailMessage()
    msg["From"] = formataddr((SENDER_NAME, s.gmail_user))
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    # Google shows app passwords in groups of four; the spaces are not part of it.
    password = s.gmail_app_password.replace(" ", "")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
        smtp.login(s.gmail_user, password)
        smtp.send_message(msg)
