"""
Transactional and SMTP email dispatch service for PantherTMS.
Uses Python's standard library smtplib in non-blocking worker threads.
"""
import smtplib
import ssl
import asyncio
from email.message import EmailMessage
from email.utils import formataddr
from typing import Tuple, Optional


def _sync_send_smtp_email(
    smtp_host: str,
    smtp_port: int,
    sender_email: str,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    sender_name: Optional[str] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None,
    use_tls: bool = True,
    use_ssl: bool = False,
    timeout: int = 12,
) -> Tuple[bool, str]:
    """Synchronous worker that connects to the SMTP server and dispatches an email."""
    if not smtp_host or not sender_email or not to_email:
        return False, "Missing required SMTP parameters (host, sender email, or recipient email)."

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((sender_name or "", sender_email))
    msg["To"] = to_email

    if text_content:
        msg.set_content(text_content)
        msg.add_alternative(html_content, subtype="html")
    else:
        msg.set_content(html_content, subtype="html")

    context = ssl.create_default_context()

    try:
        if use_ssl or smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=timeout) as server:
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=timeout) as server:
                server.ehlo()
                if use_tls:
                    server.starttls(context=context)
                    server.ehlo()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.send_message(msg)

        return True, f"Email delivered successfully to {to_email} via {smtp_host}:{smtp_port}."

    except smtplib.SMTPAuthenticationError as auth_err:
        return False, f"SMTP Authentication failed: Invalid username or app password. ({auth_err.smtp_error.decode() if isinstance(auth_err.smtp_error, bytes) else auth_err.smtp_error})"
    except smtplib.SMTPConnectError as conn_err:
        return False, f"Unable to connect to SMTP server at {smtp_host}:{smtp_port}. Please check host and port."
    except TimeoutError:
        return False, f"Connection timed out while connecting to {smtp_host}:{smtp_port}."
    except Exception as exc:
        return False, f"SMTP delivery failed: {str(exc)}"


async def send_smtp_email(
    smtp_host: str,
    smtp_port: int,
    sender_email: str,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    sender_name: Optional[str] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None,
    use_tls: bool = True,
    use_ssl: bool = False,
    timeout: int = 12,
) -> Tuple[bool, str]:
    """Asynchronous wrapper that runs SMTP dispatch in a background thread."""
    return await asyncio.to_thread(
        _sync_send_smtp_email,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        sender_email=sender_email,
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        sender_name=sender_name,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        timeout=timeout,
    )


def build_test_email_html(sender_name: str, sender_email: str, smtp_host: str, smtp_port: int) -> str:
    """Renders a polished, responsive test email verifying SMTP configuration."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .card {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 580px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 20px 24px; color: #ffffff; }}
        .badge {{ display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; }}
        .content {{ padding: 24px; }}
        .table {{ width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; font-size: 13px; }}
        .table td {{ padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }}
        .table td.label {{ color: #64748b; font-weight: 600; width: 35%; }}
        .table td.value {{ color: #0f172a; font-family: monospace; }}
        .footer {{ background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">SMTP Verified</div>
          <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 600;">PantherTMS Outbound Email Gateway</h2>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 14px; line-height: 1.5;">
            This is a test notification confirming that your outbound email gateway parameters in <strong>PantherTMS</strong> are successfully configured and active.
          </p>
          <table class="table">
            <tr>
              <td class="label">Sender Display Name</td>
              <td class="value">{sender_name or "PantherTMS Dispatch"}</td>
            </tr>
            <tr>
              <td class="label">Sender Email Address</td>
              <td class="value">{sender_email}</td>
            </tr>
            <tr>
              <td class="label">SMTP Host Server</td>
              <td class="value">{smtp_host}</td>
            </tr>
            <tr>
              <td class="label">SMTP Port Number</td>
              <td class="value">{smtp_port}</td>
            </tr>
            <tr>
              <td class="label">Connection Status</td>
              <td class="value" style="color: #059669; font-weight: bold;">AUTHENTICATED & ACTIVE</td>
            </tr>
          </table>
          <p style="margin-bottom: 0; font-size: 13px; color: #64748b;">
            All system notifications (Lorry Receipts, Job Orders, Hire Challans, GST Invoices, and POD receipts) will now be dispatched through this gateway.
          </p>
        </div>
        <div class="footer">
          PantherTMS Enterprise Transport Management • Automated System Verification
        </div>
      </div>
    </body>
    </html>
    """
