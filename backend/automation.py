import os
import json
import random
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext
from db_client import supabase
from config import GEMINI_API_KEY, FRONTEND_URL
from encryption import decrypt_value
from gemini_ai import detect_reply_from_screenshot, suggest_locator_from_screenshot
from push_notifications import send_push_to_all_devices
from email_reports import send_email_report

STORAGE_STATE_PATH = "/tmp/storage_state.json"

class LinkedInAutomation:
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.daily_count = 0
        self.daily_target = 0
        self.campaign = None
        self.min_delay = 120
        self.max_delay = 240
        self.draft_variant = "A"
        self.profile_index = 0

    def random_delay(self, min_sec: int = None, max_sec: int = None) -> float:
        min_sec = min_sec or self.min_delay
        max_sec = max_sec or self.max_delay
        return random.uniform(min_sec, max_sec)

    def sleep_random(self, min_sec: int = None, max_sec: int = None):
        time.sleep(self.random_delay(min_sec, max_sec))

    def launch(self):
        playwright = sync_playwright().start()
        self.browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-blink-features=AutomationControlled"])
        if os.path.exists(STORAGE_STATE_PATH):
            self.context = self.browser.new_context(storage_state=STORAGE_STATE_PATH, viewport={"width": 1366, "height": 768}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        else:
            self.context = self.browser.new_context(viewport={"width": 1366, "height": 768}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        self.page = self.context.new_page()

    def close(self):
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()

    def save_session(self):
        if self.context:
            self.context.storage_state(path=STORAGE_STATE_PATH)

    def check_captcha_or_session(self) -> Optional[str]:
        captcha_locator = self.get_locator("captcha_indicator")
        session_locator = self.get_locator("session_expired_indicator")
        try:
            if captcha_locator and self.page.locator(captcha_locator).count() > 0:
                return "captcha"
        except Exception:
            pass
        try:
            if session_locator and self.page.locator(session_locator).count() > 0:
                return "session_expired"
        except Exception:
            pass
        if "login" in self.page.url:
            return "session_expired"
        return None

    def get_locator(self, name: str) -> Optional[str]:
        res = supabase.table("locators").select("css_selector").eq("name", name).maybe_single().execute()
        if res.data and res.data.get("css_selector"):
            return res.data["css_selector"]
        return None

    def warm_up(self):
        print("[AUTOMATION] Starting warm-up...")
        self.page.goto("https://www.linkedin.com")
        self.sleep_random(5, 10)
        # Scroll feed
        for _ in range(random.randint(2, 4)):
            self.page.mouse.wheel(0, random.randint(300, 700))
            self.sleep_random(3, 6)
        # Click a random post
        try:
            posts = self.page.locator("[data-test-id='feed-identity-module'], .feed-shared-update-v2").all()
            if posts:
                random.choice(posts).click()
                self.sleep_random(15, 45)
                self.page.go_back()
        except Exception:
            pass
        self.sleep_random(3, 7)
        print("[AUTOMATION] Warm-up complete.")

    def run_connection_loop(self, campaign_id: str):
        camp_res = supabase.table("campaigns").select("*").eq("id", campaign_id).maybe_single().execute()
        if not camp_res.data:
            print("[AUTOMATION] Campaign not found.")
            return
        self.campaign = camp_res.data
        if self.campaign.get("status") != "active":
            print("[AUTOMATION] Campaign not active.")
            return

        self.min_delay = self.campaign.get("min_delay_seconds", 120)
        self.max_delay = self.campaign.get("max_delay_seconds", 240)
        self.daily_target = self.campaign.get("daily_target_avg", 20)
        daily_max = self.campaign.get("daily_max", 25)
        if self.daily_target > daily_max:
            self.daily_target = daily_max

        # Warm-up mode check
        if self.campaign.get("warm_up_mode"):
            created = datetime.fromisoformat(self.campaign["created_at"].replace("Z", "+00:00"))
            days_since = (datetime.utcnow() - created).days
            week = min(days_since // 7 + 1, 4)
            limits = {1: 5, 2: 10, 3: 15, 4: daily_max}
            self.daily_target = min(self.daily_target, limits.get(week, daily_max))

        self.daily_count = 0
        self.profile_index = 0

        self.launch()
        self.warm_up()

        self.page.goto(self.campaign["linkedin_search_url"])
        self.sleep_random(5, 10)

        search_card_locator = self.get_locator("search_result_card")
        if not search_card_locator:
            print("[AUTOMATION] Missing search_result_card locator.")
            self.close()
            return

        while self.daily_count < self.daily_target:
            captcha_check = self.check_captcha_or_session()
            if captcha_check:
                self.handle_alert(captcha_check)
                break

            cards = self.page.locator(search_card_locator).all()
            if not cards:
                print("[AUTOMATION] No cards found. Search exhausted.")
                supabase.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
                send_push_to_all_devices("Campaign Completed", f"Campaign '{self.campaign['name']}' has exhausted all search results.")
                break

            for card in cards:
                if self.daily_count >= self.daily_target:
                    break

                captcha_check = self.check_captcha_or_session()
                if captcha_check:
                    self.handle_alert(captcha_check)
                    break

                profile_url = None
                try:
                    link_locator = self.get_locator("profile_link_in_card")
                    if link_locator:
                        profile_url = card.locator(link_locator).get_attribute("href")
                    if not profile_url:
                        profile_url = card.locator("a").first.get_attribute("href")
                    if profile_url and not profile_url.startswith("http"):
                        profile_url = "https://www.linkedin.com" + profile_url
                except Exception:
                    continue

                if not profile_url:
                    continue

                # Check blacklist
                blacklist_res = supabase.table("blacklist").select("*").eq("value", profile_url).execute()
                if blacklist_res.data:
                    continue

                # Check already processed
                existing = supabase.table("outreach_log").select("id").eq("profile_url", profile_url).execute()
                if existing.data:
                    continue

                # Open profile
                self.page.goto(profile_url)
                self.sleep_random(self.min_delay, self.max_delay)

                # Extract name
                first_name = ""
                last_name = ""
                current_title = ""
                try:
                    fn_loc = self.get_locator("profile_first_name")
                    ln_loc = self.get_locator("profile_last_name")
                    title_loc = self.get_locator("profile_current_title")
                    if fn_loc:
                        first_name = self.page.locator(fn_loc).first.inner_text(timeout=3000)
                    if ln_loc:
                        last_name = self.page.locator(ln_loc).first.inner_text(timeout=3000)
                    if title_loc:
                        current_title = self.page.locator(title_loc).first.inner_text(timeout=3000)
                except Exception:
                    pass

                if not first_name:
                    self.log_action(profile_url, "skipped", skip_reason="name extraction failed")
                    self.page.go_back()
                    self.sleep_random(self.min_delay + 30, self.max_delay + 60)
                    continue

                # Check company blacklist
                if current_title:
                    company = current_title.split(" at ")[-1] if " at " in current_title else ""
                    if company:
                        bl = supabase.table("blacklist").select("*").eq("type", "company_name").eq("value", company).execute()
                        if bl.data:
                            self.log_action(profile_url, "skipped", skip_reason="blacklisted company")
                            self.page.go_back()
                            self.sleep_random(self.min_delay + 30, self.max_delay + 60)
                            continue

                # Draft selection
                variants = ["A"]
                if self.campaign.get("connection_draft_b"):
                    variants.append("B")
                if self.campaign.get("connection_draft_c"):
                    variants.append("C")
                self.draft_variant = variants[self.profile_index % len(variants)]
                draft_key = {"A": "connection_draft", "B": "connection_draft_b", "C": "connection_draft_c"}[self.draft_variant]
                note_draft = self.campaign.get(draft_key, "") or self.campaign.get("connection_draft", "")
                note_text = note_draft.replace("<firstname>", first_name).replace("<lastname>", last_name).replace("<currenttitle>", current_title)

                # Find connect button
                connect_clicked = False
                btn_path = ""
                try:
                    main_btn = self.get_locator("connect_btn_main")
                    if main_btn and self.page.locator(main_btn).count() > 0:
                        self.page.locator(main_btn).first.click()
                        connect_clicked = True
                        btn_path = "main"
                except Exception:
                    pass

                if not connect_clicked:
                    try:
                        more_btn = self.get_locator("more_btn")
                        if more_btn and self.page.locator(more_btn).count() > 0:
                            self.page.locator(more_btn).first.click()
                            time.sleep(1)
                            dropdown_btn = self.get_locator("connect_in_more_dropdown")
                            if dropdown_btn and self.page.locator(dropdown_btn).count() > 0:
                                self.page.locator(dropdown_btn).first.click()
                                connect_clicked = True
                                btn_path = "more_dropdown"
                    except Exception:
                        pass

                if not connect_clicked:
                    self.log_action(profile_url, "skipped", skip_reason="connect unavailable (already connected, pending, or follow button only)")
                    self.page.go_back()
                    self.sleep_random(self.min_delay + 30, self.max_delay + 60)
                    continue

                self.sleep_random(self.min_delay, self.max_delay)

                # Add note
                try:
                    add_note = self.get_locator("add_note_btn")
                    if add_note and self.page.locator(add_note).count() > 0:
                        self.page.locator(add_note).first.click()
                        self.sleep_random(self.min_delay, self.max_delay)
                        note_area = self.get_locator("note_textarea")
                        if note_area:
                            textarea = self.page.locator(note_area).first
                            for char in note_text:
                                textarea.type(char, delay=random.randint(50, 200))
                        self.sleep_random(self.min_delay, self.max_delay)
                        send_btn = self.get_locator("send_with_note_btn")
                        if send_btn:
                            self.page.locator(send_btn).first.click()
                        time.sleep(3)
                except Exception as e:
                    print(f"[AUTOMATION] Note send error: {e}")

                # Check privacy wall / captcha after send
                privacy_check = self.check_captcha_or_session()
                if privacy_check == "captcha":
                    self.handle_alert("captcha")
                    break
                # Check if email-required privacy wall appeared
                try:
                    if self.page.locator("text=email").count() > 0 and self.page.locator("text=continue").count() > 0:
                        self.log_action(profile_url, "skipped", skip_reason="privacy wall - email required")
                        continue
                except Exception:
                    pass

                self.log_action(profile_url, "sent", first_name=first_name, last_name=last_name, current_title=current_title, note_content=note_text, connect_btn_path=btn_path, draft_variant=self.draft_variant)
                self.daily_count += 1
                self.profile_index += 1
                supabase.table("campaigns").update({"total_sent": self.campaign.get("total_sent", 0) + 1, "last_run_at": datetime.utcnow().isoformat()}).eq("id", campaign_id).execute()

                # Update daily schedule actual_sent
                today = date.today().isoformat()
                monday = (date.today() - timedelta(days=date.today().weekday())).isoformat()
                sched = supabase.table("daily_schedule").select("*").eq("week_start", monday).maybe_single().execute()
                if sched.data:
                    actual = sched.data.get("actual_sent", {})
                    actual[today] = actual.get(today, 0) + 1
                    supabase.table("daily_schedule").update({"actual_sent": actual}).eq("week_start", monday).execute()

                self.page.go_back()
                self.sleep_random(self.min_delay + 30, self.max_delay + 60)

            # Next page
            if self.daily_count < self.daily_target:
                next_btn = self.get_locator("next_page_btn")
                if next_btn:
                    try:
                        has_next = self.page.locator(next_btn).count() > 0
                        if has_next:
                            self.page.locator(next_btn).first.click()
                            self.sleep_random(45, 90)
                        else:
                            print("[AUTOMATION] No next page. Search exhausted.")
                            supabase.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
                            send_push_to_all_devices("Campaign Completed", f"Campaign '{self.campaign['name']}' has exhausted all search results.")
                            break
                    except Exception:
                        break
                else:
                    break

        self.save_session()
        self.close()
        print(f"[AUTOMATION] Connection loop finished. Sent {self.daily_count} today.")

    def log_action(self, profile_url: str, status: str, **kwargs):
        data = {
            "id": str(uuid.uuid4()),
            "campaign_id": self.campaign["id"],
            "profile_url": profile_url,
            "status": status,
            "connection_sent_at": datetime.utcnow().isoformat() if status == "sent" else None,
            "day_batch": date.today().isoformat(),
        }
        for k, v in kwargs.items():
            data[k] = v
        supabase.table("outreach_log").insert(data).execute()

    def handle_alert(self, alert_type: str):
        supabase.table("config").update({"bot_status": alert_type.replace("_", " ").title()}).eq("id", 1).execute()
        if alert_type == "captcha":
            send_push_to_all_devices("CAPTCHA Detected", "LinkedIn wants to verify you. Open LinkedIn and solve it manually, then click Session Refreshed in the web app.")
            supabase.table("config").update({"captcha_detected": True, "session_paused": True}).eq("id", 1).execute()
        elif alert_type == "session_expired":
            send_push_to_all_devices("Session Expired", "LinkedIn session expired. Please log in again from the web app.")
            supabase.table("config").update({"session_expired": True, "session_paused": True}).eq("id", 1).execute()
        self.save_session()
        self.close()

    def run_acceptance_checker(self):
        print("[AUTOMATION] Running acceptance checker...")
        self.launch()
        pending = supabase.table("outreach_log").select("*").is_("connection_accepted", "null").eq("status", "sent").execute()
        followed_up = supabase.table("outreach_log").select("*").eq("followup_sent", True).eq("reply_detected", False).execute()

        for row in (pending.data or []) + (followed_up.data or []):
            captcha_check = self.check_captcha_or_session()
            if captcha_check:
                self.handle_alert(captcha_check)
                return

            self.page.goto(row["profile_url"])
            self.sleep_random(3, 6)

            badge = self.get_locator("connection_1st_badge")
            is_accepted = False
            if badge:
                try:
                    is_accepted = self.page.locator(badge).count() > 0
                except Exception:
                    pass

            if is_accepted and row.get("status") == "sent":
                supabase.table("outreach_log").update({
                    "connection_accepted": True,
                    "accepted_at": datetime.utcnow().isoformat(),
                    "status": "accepted",
                }).eq("id", row["id"]).execute()
                supabase.table("campaigns").update({"total_accepted": self.campaign.get("total_accepted", 0) + 1 if self.campaign else 0}).eq("id", row["campaign_id"]).execute()
                self.send_followup(row)
            else:
                supabase.table("outreach_log").update({"reply_checked_at": datetime.utcnow().isoformat()}).eq("id", row["id"]).execute()

            # Reply check for followed-up profiles
            if row.get("status") in ("followed_up", "second_followed_up"):
                self.check_reply(row)

            self.sleep_random(30, 60)

        self.save_session()
        self.close()
        print("[AUTOMATION] Acceptance checker complete.")

    def send_followup(self, row: Dict[str, Any]):
        try:
            campaign = supabase.table("campaigns").select("*").eq("id", row["campaign_id"]).maybe_single().execute()
            if not campaign.data:
                return
            camp = campaign.data

            # Re-read names
            first_name = ""
            last_name = ""
            try:
                fn_loc = self.get_locator("profile_first_name")
                ln_loc = self.get_locator("profile_last_name")
                if fn_loc:
                    first_name = self.page.locator(fn_loc).first.inner_text(timeout=3000)
                if ln_loc:
                    last_name = self.page.locator(ln_loc).first.inner_text(timeout=3000)
            except Exception:
                first_name = row.get("first_name", "")
                last_name = row.get("last_name", "")

            followup_text = (camp.get("followup_draft", "") or "").replace("<firstname>", first_name).replace("<lastname>", last_name).replace("<currenttitle>", row.get("current_title", ""))

            msg_btn = self.get_locator("message_btn")
            if msg_btn and self.page.locator(msg_btn).count() > 0:
                self.page.locator(msg_btn).first.click()
                self.sleep_random(self.min_delay, self.max_delay)
                msg_area = self.get_locator("message_textarea")
                if msg_area:
                    textarea = self.page.locator(msg_area).first
                    for char in followup_text:
                        textarea.type(char, delay=random.randint(50, 200))
                self.sleep_random(self.min_delay, self.max_delay)
                send_btn = self.get_locator("message_send_btn")
                if send_btn:
                    self.page.locator(send_btn).first.click()
                time.sleep(2)

            supabase.table("outreach_log").update({
                "followup_sent": True,
                "followup_sent_at": datetime.utcnow().isoformat(),
                "followup_content": followup_text,
                "status": "followed_up",
            }).eq("id", row["id"]).execute()

            # Immediate reply check
            self.check_reply(row)

            # Second follow-up scheduling (7 days later, handled by scheduler)
        except Exception as e:
            print(f"[AUTOMATION] Follow-up error: {e}")

    def check_reply(self, row: Dict[str, Any]):
        try:
            container = self.get_locator("message_thread_container")
            if not container:
                return
            thread = self.page.locator(container)
            if thread.count() == 0:
                return
            screenshot_bytes = thread.screenshot()
            result = detect_reply_from_screenshot(screenshot_bytes, GEMINI_API_KEY)
            if result.get("has_reply"):
                supabase.table("outreach_log").update({
                    "reply_detected": True,
                    "reply_summary": result.get("summary", ""),
                    "reply_sentiment": result.get("sentiment", "neutral"),
                    "reply_checked_at": datetime.utcnow().isoformat(),
                    "status": "replied",
                }).eq("id", row["id"]).execute()
                camp_res = supabase.table('campaigns').select('*').eq('id', row['campaign_id']).maybe_single().execute()
                camp_data = camp_res.data if camp_res else None
                if camp_data:
                    supabase.table("campaigns").update({"total_replied": (camp_data.get("total_replied", 0) or 0) + 1}).eq("id", row["campaign_id"]).execute()
            else:
                supabase.table("outreach_log").update({"reply_checked_at": datetime.utcnow().isoformat()}).eq("id", row["id"]).execute()
        except Exception as e:
            print(f"[AUTOMATION] Reply check error: {e}")

    def send_second_followup(self, row: Dict[str, Any]):
        try:
            campaign = supabase.table("campaigns").select("*").eq("id", row["campaign_id"]).maybe_single().execute()
            if not campaign.data:
                return
            camp = campaign.data
            if not camp.get("second_followup_draft"):
                return

            self.page.goto(row["profile_url"])
            self.sleep_random(3, 6)

            first_name = row.get("first_name", "")
            last_name = row.get("last_name", "")
            text = camp["second_followup_draft"].replace("<firstname>", first_name).replace("<lastname>", last_name).replace("<currenttitle>", row.get("current_title", ""))

            msg_btn = self.get_locator("message_btn")
            if msg_btn and self.page.locator(msg_btn).count() > 0:
                self.page.locator(msg_btn).first.click()
                self.sleep_random(self.min_delay, self.max_delay)
                msg_area = self.get_locator("message_textarea")
                if msg_area:
                    textarea = self.page.locator(msg_area).first
                    for char in text:
                        textarea.type(char, delay=random.randint(50, 200))
                self.sleep_random(self.min_delay, self.max_delay)
                send_btn = self.get_locator("message_send_btn")
                if send_btn:
                    self.page.locator(send_btn).first.click()

            supabase.table("outreach_log").update({
                "second_followup_sent": True,
                "second_followup_sent_at": datetime.utcnow().isoformat(),
                "status": "second_followed_up",
            }).eq("id", row["id"]).execute()
        except Exception as e:
            print(f"[AUTOMATION] Second follow-up error: {e}")

def run_daily_connection_job():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sched = supabase.table("daily_schedule").select("*").eq("week_start", monday.isoformat()).maybe_single().execute()
    if not sched.data:
        print("[SCHEDULER] No schedule for this week.")
        return
    schedule = sched.data
    day_name = today.strftime("%a")
    if day_name not in schedule.get("scheduled_days", []):
        print("[SCHEDULER] Today is not a scheduled day.")
        return

    # Find campaign to run (oldest last_run_at among active)
    campaigns = supabase.table("campaigns").select("*").eq("status", "active").order("last_run_at", desc=False).execute()
    if not campaigns.data:
        print("[SCHEDULER] No active campaigns.")
        return
    campaign = campaigns.data[0]

    # Check session pause
    cfg = supabase.table("config").select("session_paused, captcha_detected").eq("id", 1).maybe_single().execute()
    if cfg.data and cfg.data.get("session_paused"):
        print("[SCHEDULER] Session is paused. Skipping run.")
        return

    supabase.table("config").update({"bot_status": "Running Connection Job", "last_run_at": datetime.utcnow().isoformat()}).eq("id", 1).execute()
    auto = LinkedInAutomation()
    try:
        auto.run_connection_loop(campaign["id"])
    except Exception as e:
        print(f"[SCHEDULER] Connection job error: {e}")
        send_push_to_all_devices("Automation Error", f"Connection job failed: {str(e)[:100]}")
    finally:
        supabase.table("config").update({"bot_status": "Idle"}).eq("id", 1).execute()

def run_acceptance_checker_job():
    cfg = supabase.table("config").select("session_paused").eq("id", 1).maybe_single().execute()
    if cfg.data and cfg.data.get("session_paused"):
        print("[SCHEDULER] Session paused. Skipping acceptance check.")
        return
    supabase.table("config").update({"bot_status": "Running Checker"}).eq("id", 1).execute()
    auto = LinkedInAutomation()
    try:
        auto.run_acceptance_checker()
    except Exception as e:
        print(f"[SCHEDULER] Checker error: {e}")
    finally:
        supabase.table("config").update({"bot_status": "Idle"}).eq("id", 1).execute()

def run_second_followup_job():
    # Find outreach log entries with followup_sent=true, second_followup_sent=false/null, reply_detected=false, and 7+ days since followup_sent_at
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    rows = supabase.table("outreach_log").select("*").eq("followup_sent", True).is_("second_followup_sent", "null").eq("reply_detected", False).lt("followup_sent_at", seven_days_ago).execute()
    if not rows.data:
        return
    auto = LinkedInAutomation()
    auto.launch()
    for row in rows.data:
        auto.send_second_followup(row)
    auto.close()

def run_email_report_job():
    try:
        send_email_report()
    except Exception as e:
        print(f"[SCHEDULER] Email report error: {e}")
