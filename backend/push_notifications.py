from pywebpush import webpush, WebPushException
from backend.db_client import supabase
from backend.config import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY
import json
import uuid
from datetime import datetime

def send_push_to_device(device_id: str, title: str, body: str):
    subs = supabase.table("push_subscriptions").select("*").eq("device_id", device_id).execute()
    if not subs.data:
        return
    for sub in subs.data:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {"p256dh": sub["p256dh_key"], "auth": sub["auth_key"]},
                },
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": "mailto:admin@linkedinbot.local"},
            )
        except WebPushException as e:
            print(f"[PUSH] Push error: {e}")

def send_push_to_all_devices(title: str, body: str):
    devices = supabase.table("paired_devices").select("*").eq("is_active", True).execute()
    if not devices.data:
        return
    for dev in devices.data:
        send_push_to_device(dev["id"], title, body)
    # Also log to notification_log
    supabase.table("notification_log").insert({
        "id": str(uuid.uuid4()),
        "type": title.lower().replace(" ", "_"),
        "message": body,
        "sent_at": datetime.utcnow().isoformat(),
        "read": False,
    }).execute()
