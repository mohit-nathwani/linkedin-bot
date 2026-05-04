from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import random
import string
from datetime import datetime, timedelta, date
from jose import jwt, JWTError
from db_client import supabase
from config import ENCRYPTION_KEY, VAPID_PUBLIC_KEY, FRONTEND_URL
from encryption import encrypt_value, decrypt_value
from scheduler import start_scheduler

app = FastAPI(title="LinkedIn Outreach Bot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT config
JWT_SECRET = ENCRYPTION_KEY or "linkedin-bot-secret-key-min-32-chars-long"
JWT_ALGORITHM = "HS256"

def create_device_token(device_id: str) -> str:
    return jwt.encode({"device_id": device_id, "exp": datetime.utcnow() + timedelta(days=3650)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_device_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("device_id")
    except JWTError:
        return None

# =======================
# Pydantic Models
# =======================
class SetupConfig(BaseModel):
    app_name: str
    app_logo_url: str
    primary_color: str = "#1F4E79"
    secondary_color: str = "#4A90D9"
    report_email: str
    gmail_app_password: str
    gemini_api_key: str
    supabase_url: str

class CampaignCreate(BaseModel):
    name: str
    linkedin_search_url: str
    connection_draft: str
    connection_draft_b: Optional[str] = ""
    connection_draft_c: Optional[str] = ""
    followup_draft: str
    second_followup_draft: Optional[str] = ""
    daily_target_avg: int = 20
    daily_max: int = 25
    min_delay_seconds: int = 120
    max_delay_seconds: int = 240
    warm_up_mode: bool = False

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    linkedin_search_url: Optional[str] = None
    connection_draft: Optional[str] = None
    connection_draft_b: Optional[str] = None
    connection_draft_c: Optional[str] = None
    followup_draft: Optional[str] = None
    second_followup_draft: Optional[str] = None
    daily_target_avg: Optional[int] = None
    daily_max: Optional[int] = None
    min_delay_seconds: Optional[int] = None
    max_delay_seconds: Optional[int] = None
    status: Optional[str] = None
    warm_up_mode: Optional[bool] = None
    delay_warning_acknowledged: Optional[bool] = None

class PairingCodeRequest(BaseModel):
    pass

class PairingVerify(BaseModel):
    pairing_code: str
    device_label: Optional[str] = "Mobile Device"

class PushSubscription(BaseModel):
    device_token: str
    endpoint: str
    p256dh_key: str
    auth_key: str

class LocatorUpdate(BaseModel):
    css_selector: Optional[str] = None
    xpath: Optional[str] = None

class BlacklistEntry(BaseModel):
    type: str
    value: str
    reason: Optional[str] = ""

class ScheduleOverride(BaseModel):
    action: str

class SessionRefresh(BaseModel):
    refreshed: bool = True

class NotificationToggle(BaseModel):
    type: str
    enabled: bool

# =======================
# Endpoints
# =======================

@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.get("/api/config")
def get_config():
    res = supabase.table("config").select("*").eq("id", 1).maybe_single().execute()
    if not res.data:
        return {"setup_complete": False}
    cfg = res.data
    return {
        "setup_complete": cfg.get("setup_complete", False),
        "app_name": cfg.get("app_name", "LinkedIn Outreach Bot"),
        "app_logo_url": cfg.get("app_logo_url", ""),
        "primary_color": cfg.get("primary_color", "#1F4E79"),
        "secondary_color": cfg.get("secondary_color", "#4A90D9"),
        "vapid_public_key": VAPID_PUBLIC_KEY,
    }

@app.post("/api/setup")
def save_setup(payload: SetupConfig):
    try:
        data = {
            "id": 1,
            "app_name": payload.app_name,
            "app_logo_url": payload.app_logo_url,
            "primary_color": payload.primary_color,
            "secondary_color": payload.secondary_color,
            "report_email": encrypt_value(payload.report_email),
            "gmail_app_password": encrypt_value(payload.gmail_app_password),
            "gemini_api_key": encrypt_value(payload.gemini_api_key),
            "supabase_url": payload.supabase_url,
            "setup_complete": True,
            "created_at": datetime.utcnow().isoformat(),
            "vapid_public_key": VAPID_PUBLIC_KEY,
        }
        supabase.table("config").upsert(data).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/config")
def get_admin_config():
    res = supabase.table("config").select("*").eq("id", 1).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Config not found")
    cfg = res.data
    return {
        "app_name": cfg.get("app_name", ""),
        "app_logo_url": cfg.get("app_logo_url", ""),
        "primary_color": cfg.get("primary_color", ""),
        "secondary_color": cfg.get("secondary_color", ""),
        "report_email": decrypt_value(cfg.get("report_email", "")),
        "gemini_api_key": decrypt_value(cfg.get("gemini_api_key", ""))[:10] + "...",
    }

@app.put("/api/admin/config")
def update_admin_config(payload: Dict[str, Any]):
    update = {}
    for k, v in payload.items():
        if k in ("report_email", "gmail_app_password", "gemini_api_key") and v:
            update[k] = encrypt_value(v)
        else:
            update[k] = v
    update["id"] = 1
    supabase.table("config").upsert(update).execute()
    return {"success": True}

@app.get("/api/campaigns")
def list_campaigns():
    res = supabase.table("campaigns").select("*").order("created_at", desc=True).execute()
    return {"campaigns": res.data or []}

@app.post("/api/campaigns")
def create_campaign(payload: CampaignCreate):
    campaign_id = str(uuid.uuid4())
    data = payload.dict()
    data["id"] = campaign_id
    data["status"] = "active"
    data["total_sent"] = 0
    data["total_accepted"] = 0
    data["total_replied"] = 0
    data["created_at"] = datetime.utcnow().isoformat()
    data["last_run_at"] = None
    data["delay_warning_acknowledged"] = False
    supabase.table("campaigns").insert(data).execute()
    return {"success": True, "campaign_id": campaign_id}

@app.get("/api/campaigns/{campaign_id}")
def get_campaign(campaign_id: str):
    res = supabase.table("campaigns").select("*").eq("id", campaign_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return res.data

@app.put("/api/campaigns/{campaign_id}")
def update_campaign(campaign_id: str, payload: CampaignUpdate):
    data = {k: v for k, v in payload.dict().items() if v is not None}
    supabase.table("campaigns").update(data).eq("id", campaign_id).execute()
    return {"success": True}

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str):
    supabase.table("campaigns").delete().eq("id", campaign_id).execute()
    return {"success": True}

@app.post("/api/campaigns/{campaign_id}/pause")
def pause_campaign(campaign_id: str):
    supabase.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
    return {"success": True}

@app.post("/api/campaigns/{campaign_id}/resume")
def resume_campaign(campaign_id: str):
    supabase.table("campaigns").update({"status": "active"}).eq("id", campaign_id).execute()
    return {"success": True}

@app.post("/api/campaigns/{campaign_id}/stop")
def stop_campaign(campaign_id: str):
    supabase.table("campaigns").update({"status": "stopped"}).eq("id", campaign_id).execute()
    return {"success": True}

@app.post("/api/pairing/generate")
def generate_pairing_code():
    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.utcnow() + timedelta(minutes=10)
    data = {
        "id": str(uuid.uuid4()),
        "pairing_code": code,
        "device_token": None,
        "device_label": None,
        "paired_at": None,
        "code_expires_at": expires.isoformat(),
        "is_active": True,
    }
    supabase.table("paired_devices").insert(data).execute()
    return {"pairing_code": code, "expires_at": expires.isoformat()}

@app.post("/api/pairing/verify")
def verify_pairing(payload: PairingVerify):
    res = supabase.table("paired_devices").select("*").eq("pairing_code", payload.pairing_code).eq("is_active", True).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Invalid or expired pairing code")
    device = res.data[0]
    if datetime.fromisoformat(device["code_expires_at"].replace("Z", "+00:00")) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Pairing code expired")
    device_id = device["id"]
    token = create_device_token(device_id)
    supabase.table("paired_devices").update({
        "device_token": token,
        "device_label": payload.device_label,
        "paired_at": datetime.utcnow().isoformat(),
        "pairing_code": None,
    }).eq("id", device_id).execute()
    return {"device_token": token, "device_id": device_id}

@app.get("/api/pairing/devices")
def list_paired_devices():
    res = supabase.table("paired_devices").select("*").eq("is_active", True).execute()
    return {"devices": res.data or []}

@app.post("/api/pairing/unpair/{device_id}")
def unpair_device(device_id: str):
    supabase.table("paired_devices").update({"is_active": False}).eq("id", device_id).execute()
    supabase.table("push_subscriptions").delete().eq("device_id", device_id).execute()
    return {"success": True}

@app.post("/api/push/subscribe")
def subscribe_push(payload: PushSubscription):
    device_id = verify_device_token(payload.device_token)
    if not device_id:
        raise HTTPException(status_code=401, detail="Invalid device token")
    data = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "endpoint": payload.endpoint,
        "p256dh_key": payload.p256dh_key,
        "auth_key": payload.auth_key,
        "created_at": datetime.utcnow().isoformat(),
    }
    supabase.table("push_subscriptions").upsert(data).execute()
    return {"success": True}

@app.post("/api/push/test")
def send_test_notification(payload: Dict[str, str]):
    from push_notifications import send_push_to_device
    device_id = payload.get("device_id")
    if device_id:
        send_push_to_device(device_id, "Test Notification", "This is a test push from LinkedReach.")
    return {"success": True}

@app.get("/api/locators")
def list_locators():
    res = supabase.table("locators").select("*").order("name").execute()
    return {"locators": res.data or []}

@app.put("/api/locators/{locator_name}")
def update_locator(locator_name: str, payload: LocatorUpdate):
    data = {k: v for k, v in payload.dict().items() if v is not None}
    data["last_updated"] = datetime.utcnow().isoformat()
    supabase.table("locators").update(data).eq("name", locator_name).execute()
    return {"success": True}

@app.post("/api/locators/{locator_name}/test")
def test_locator(locator_name: str):
    return {"locator_name": locator_name, "result": "pass", "message": "Locator found on test page (simulated)"}

@app.get("/api/blacklist")
def list_blacklist():
    res = supabase.table("blacklist").select("*").order("added_at", desc=True).execute()
    return {"blacklist": res.data or []}

@app.post("/api/blacklist")
def add_blacklist(payload: BlacklistEntry):
    data = {
        "id": str(uuid.uuid4()),
        "type": payload.type,
        "value": payload.value,
        "reason": payload.reason,
        "added_at": datetime.utcnow().isoformat(),
    }
    supabase.table("blacklist").insert(data).execute()
    return {"success": True}

@app.delete("/api/blacklist/{entry_id}")
def remove_blacklist(entry_id: str):
    supabase.table("blacklist").delete().eq("id", entry_id).execute()
    return {"success": True}

@app.get("/api/schedule/current")
def get_current_schedule():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    res = supabase.table("daily_schedule").select("*").eq("week_start", monday.isoformat()).execute()
    if res.data:
        return res.data[0]
    return {"week_start": monday.isoformat(), "scheduled_days": [], "daily_targets": {}, "actual_sent": {}, "campaign_rotation": {}}

@app.post("/api/schedule/override")
def schedule_override(payload: ScheduleOverride):
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    res = supabase.table("daily_schedule").select("*").eq("week_start", monday.isoformat()).execute()
    if res.data:
        schedule = res.data[0]
    else:
        schedule = {"week_start": monday.isoformat(), "scheduled_days": [], "daily_targets": {}, "actual_sent": {}, "campaign_rotation": {}}
    if payload.action == "regenerate_week":
        from scheduler import generate_weekly_schedule
        generate_weekly_schedule()
        return {"success": True, "message": "Week schedule regenerated"}
    elif payload.action == "run_today":
        day_name = today.strftime("%a")
        scheduled = list(schedule.get("scheduled_days", []))
        if day_name not in scheduled:
            scheduled.append(day_name)
        targets = schedule.get("daily_targets", {})
        if day_name not in targets:
            targets[day_name] = 20
        supabase.table("daily_schedule").upsert({
            "week_start": monday.isoformat(),
            "scheduled_days": scheduled,
            "daily_targets": targets,
        }).execute()
        return {"success": True, "message": "Today added to schedule"}
    elif payload.action == "skip_today":
        day_name = today.strftime("%a")
        scheduled = [d for d in schedule.get("scheduled_days", []) if d != day_name]
        supabase.table("daily_schedule").upsert({
            "week_start": monday.isoformat(),
            "scheduled_days": scheduled,
        }).execute()
        return {"success": True, "message": "Today removed from schedule"}
    return {"success": False, "message": "Unknown action"}

@app.get("/api/dashboard/stats")
def dashboard_stats():
    today = date.today().isoformat()
    sent_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today).eq("status", "sent").execute()
    accepted_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today).eq("connection_accepted", True).execute()
    followups_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today).eq("followup_sent", True).execute()
    replies_today = supabase.table("outreach_log").select("*", count="exact").eq("day_batch", today).eq("reply_detected", True).execute()
    total_sent = supabase.table("outreach_log").select("*", count="exact").eq("status", "sent").execute()
    total_accepted = supabase.table("outreach_log").select("*", count="exact").eq("connection_accepted", True).execute()
    total_followups = supabase.table("outreach_log").select("*", count="exact").eq("followup_sent", True).execute()
    total_replies = supabase.table("outreach_log").select("*", count="exact").eq("reply_detected", True).execute()
    active_campaigns = supabase.table("campaigns").select("*", count="exact").eq("status", "active").execute()
    return {
        "today": {"sent": sent_today.count or 0, "accepted": accepted_today.count or 0, "followups": followups_today.count or 0, "replies": replies_today.count or 0},
        "all_time": {"sent": total_sent.count or 0, "accepted": total_accepted.count or 0, "followups": total_followups.count or 0, "replies": total_replies.count or 0},
        "active_campaigns": active_campaigns.count or 0,
    }

@app.get("/api/dashboard/activity")
def recent_activity(limit: int = 50):
    res = supabase.table("outreach_log").select("*, campaigns(name)").order("connection_sent_at", desc=True).limit(limit).execute()
    return {"activity": res.data or []}

@app.get("/api/outreach-log")
def get_outreach_log(campaign_id: Optional[str] = None, status: Optional[str] = None, limit: int = 100, offset: int = 0):
    query = supabase.table("outreach_log").select("*, campaigns(name)").order("connection_sent_at", desc=True)
    if campaign_id:
        query = query.eq("campaign_id", campaign_id)
    if status:
        query = query.eq("status", status)
    res = query.limit(limit).offset(offset).execute()
    return {"logs": res.data or [], "limit": limit, "offset": offset}

@app.get("/api/notifications")
def get_notifications(device_token: Optional[str] = None, limit: int = 50):
    query = supabase.table("notification_log").select("*").order("sent_at", desc=True).limit(limit)
    res = query.execute()
    return {"notifications": res.data or []}

@app.post("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str):
    supabase.table("notification_log").update({"read": True}).eq("id", notif_id).execute()
    return {"success": True}

@app.post("/api/session/refresh")
def session_refresh(payload: SessionRefresh):
    supabase.table("config").update({"session_paused": False, "captcha_detected": False, "last_session_refresh": datetime.utcnow().isoformat()}).eq("id", 1).execute()
    return {"success": True, "message": "Session refreshed. Automation will resume on next scheduled run."}

@app.get("/api/session/status")
def session_status():
    res = supabase.table("config").select("session_paused, captcha_detected, last_session_refresh").eq("id", 1).maybe_single().execute()
    if res.data:
        return res.data
    return {"session_paused": False, "captcha_detected": False}

@app.get("/api/bot/status")
def bot_status():
    res = supabase.table("config").select("bot_status, last_run_at, next_run_at, session_paused, captcha_detected").eq("id", 1).maybe_single().execute()
    if res.data:
        return res.data
    return {"bot_status": "Idle", "last_run_at": None, "next_run_at": None, "session_paused": False, "captcha_detected": False}

@app.get("/api/notification-settings")
def get_notification_settings():
    res = supabase.table("config").select("notif_captcha, notif_session_expired, notif_campaign_complete, notif_daily_summary, notif_locator_fail").eq("id", 1).maybe_single().execute()
    if res.data:
        return res.data
    return {"notif_captcha": True, "notif_session_expired": True, "notif_campaign_complete": True, "notif_daily_summary": True, "notif_locator_fail": True}

@app.put("/api/notification-settings")
def update_notification_settings(payload: Dict[str, Any]):
    supabase.table("config").update(payload).eq("id", 1).execute()
    return {"success": True}

@app.get("/api/campaigns/{campaign_id}/warmup-week")
def get_warmup_week(campaign_id: str):
    res = supabase.table("campaigns").select("created_at, warm_up_mode, daily_max").eq("id", campaign_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    camp = res.data
    if not camp.get("warm_up_mode"):
        return {"warm_up_active": False, "current_week": None, "current_max": camp.get("daily_max", 25)}
    created = datetime.fromisoformat(camp["created_at"].replace("Z", "+00:00"))
    days_since = (datetime.utcnow() - created).days
    week = min(days_since // 7 + 1, 4)
    limits = {1: 5, 2: 10, 3: 15, 4: camp.get("daily_max", 25)}
    return {"warm_up_active": True, "current_week": week, "current_max": limits.get(week, 25)}

# Start scheduler on import
start_scheduler()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
