import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date, timedelta
from backend.db_client import supabase
from backend.config import GMAIL_USER, GMAIL_APP_PASSWORD
from backend.encryption import decrypt_value

def send_email_report():
    cfg = supabase.table("config").select("*").eq("id", 1).maybe_single().execute()
    if not cfg.data:
        print("[EMAIL] No config found.")
        return
    config = cfg.data
    to_email = decrypt_value(config.get("report_email", ""))
    password = decrypt_value(config.get("gmail_app_password", ""))
    app_name = config.get("app_name", "LinkedReach")
    if not to_email or not password:
        print("[EMAIL] Missing email credentials.")
        return

    today = date.today()
    today_str = today.isoformat()
    # Stats
    sent_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today_str).eq("status", "sent").execute()
    accepted_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today_str).eq("connection_accepted", True).execute()
    followups_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today_str).eq("followup_sent", True).execute()
    replies_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today_str).eq("reply_detected", True).execute()

    total_sent = supabase.table("outreach_log").select("*", count="exact").eq("status", "sent").execute()
    total_accepted = supabase.table("outreach_log").select("*", count="exact").eq("connection_accepted", True).execute()
    total_followups = supabase.table("outreach_log").select("*", count="exact").eq("followup_sent", True).execute()
    total_replies = supabase.table("outreach_log").select("*", count="exact").eq("reply_detected", True).execute()

    # New acceptances today
    new_accepts = supabase.table("outreach_log").select("*").eq("day_batch", today_str).eq("connection_accepted", True).execute()
    accepts_list = ""
    if new_accepts.data:
        for row in new_accepts.data:
            accepts_list += f"<li>{row.get('first_name', '')} {row.get('last_name', '')} - <a href='{row['profile_url']}'>{row['profile_url']}</a></li>"
    else:
        accepts_list = "<li>No new acceptances today</li>"

    # Replies today
    new_replies = supabase.table("outreach_log").select("*").eq("day_batch", today_str).eq("reply_detected", True).execute()
    replies_list = ""
    if new_replies.data:
        for row in new_replies.data:
            replies_list += f"<li>{row.get('first_name', '')} {row.get('last_name', '')}: {row.get('reply_summary', '')} ({row.get('reply_sentiment', 'neutral')})</li>"
    else:
        replies_list = "<li>No new replies today</li>"

    # Alerts
    alerts = supabase.table("notification_log").select("*").eq("type", "captcha").or_("type.eq.session_expired,type.eq.locator_fail").execute()
    alerts_list = ""
    if alerts.data:
        for a in alerts.data:
            alerts_list += f"<li>{a['type']}: {a['message']}</li>"
    else:
        alerts_list = "<li>No alerts today</li>"

    subject = f"[{app_name}] Daily Report - {today.strftime('%a %d %b %Y')} | Sent: {sent_today.count or 0} | Accepted: {accepted_today.count or 0} | Replies: {replies_today.count or 0}"

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
    <h2>{app_name} - Daily Report</h2>
    <p><strong>Date:</strong> {today.strftime('%A, %d %B %Y')}</p>
    <hr>
    <h3>Today's Sending Activity</h3>
    <ul>
        <li>Sent Today: {sent_today.count or 0}</li>
        <li>Accepted Today: {accepted_today.count or 0}</li>
        <li>Follow-Ups Today: {followups_today.count or 0}</li>
        <li>Replies Today: {replies_today.count or 0}</li>
    </ul>
    <h3>New Acceptances Today</h3>
    <ul>{accepts_list}</ul>
    <h3>New Replies Detected</h3>
    <ul>{replies_list}</ul>
    <h3>All-Time Running Totals</h3>
    <ul>
        <li>Total Sent: {total_sent.count or 0}</li>
        <li>Total Accepted: {total_accepted.count or 0}</li>
        <li>Total Follow-Ups: {total_followups.count or 0}</li>
        <li>Total Replies: {total_replies.count or 0}</li>
        <li>Acceptance Rate: {round((total_accepted.count or 0) / max(total_sent.count or 1, 1) * 100, 1)}%</li>
    </ul>
    <h3>Alerts</h3>
    <ul>{alerts_list}</ul>
    <hr>
    <p style="font-size: 12px; color: #666;">This is an automated report from your LinkedIn Outreach Bot.</p>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER or to_email
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER or to_email, password)
            server.sendmail(GMAIL_USER or to_email, to_email, msg.as_string())
        print("[EMAIL] Daily report sent.")
    except Exception as e:
        print(f"[EMAIL] Failed to send report: {e}")
