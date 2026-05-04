import random
from datetime import datetime, date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from backend.db_client import supabase
from backend.automation import run_daily_connection_job, run_acceptance_checker_job, run_second_followup_job, run_email_report_job

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

def generate_weekly_schedule():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    selected = random.sample(days, 5)
    targets = {}
    while True:
        targets = {d: random.randint(15, 25) for d in selected}
        if 90 <= sum(targets.values()) <= 105:
            break
    campaigns = supabase.table("campaigns").select("id").eq("status", "active").execute()
    rotation = {}
    if campaigns.data:
        for i, d in enumerate(selected):
            rotation[d] = campaigns.data[i % len(campaigns.data)]["id"]
    data = {
        "week_start": monday.isoformat(),
        "scheduled_days": selected,
        "daily_targets": targets,
        "actual_sent": {},
        "campaign_rotation": rotation,
        "created_at": datetime.utcnow().isoformat(),
    }
    supabase.table("daily_schedule").upsert(data).execute()
    print("[SCHEDULER] Weekly schedule generated.")

def start_scheduler():
    # Monday 8:00 AM IST -> generate weekly schedule
    scheduler.add_job(generate_weekly_schedule, CronTrigger(day_of_week="mon", hour=8, minute=0, timezone="Asia/Kolkata"), id="gen_schedule")
    # Daily 9:00 AM IST -> connection job
    scheduler.add_job(run_daily_connection_job, CronTrigger(hour=9, minute=0, timezone="Asia/Kolkata"), id="connection_job")
    # Daily 2:00 PM IST -> acceptance checker + follow-ups
    scheduler.add_job(run_acceptance_checker_job, CronTrigger(hour=14, minute=0, timezone="Asia/Kolkata"), id="checker_job")
    # Daily 10:00 PM IST -> email report
    scheduler.add_job(run_email_report_job, CronTrigger(hour=22, minute=0, timezone="Asia/Kolkata"), id="email_report")
    # Daily 3:00 PM IST -> second follow-up job
    scheduler.add_job(run_second_followup_job, CronTrigger(hour=15, minute=0, timezone="Asia/Kolkata"), id="second_followup")
    scheduler.start()
    print("[SCHEDULER] Started.")
