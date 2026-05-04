# LinkedIn Outreach Bot - Complete Implementation

This is the complete implementation of the **LinkedIn Outreach Automation Platform** as specified in the PRD.

## What's Included

### Frontend (React + Vite + TailwindCSS + PWA)
- **Setup Page** - One-time configuration for app name, colors, Gmail, Gemini API key
- **Dashboard** - Real-time stats, charts (Recharts), activity feed, weekly schedule
- **Campaign Manager** - Full CRUD with A/B/C draft variants, delay warnings, warm-up mode
- **Admin Panel** - 8 sections: Appearance, Locators, Delays, Campaigns, Schedule, Blacklist, Push Settings, Devices
- **Outreach Log** - Filterable table with search, status filters, pagination
- **Notifications** - Push notification history with read/unread
- **PWA Pairing** - 6-digit code pairing screen for mobile devices
- **PWA Support** - Service worker, offline cache, manifest, installable on iOS/Android

### Backend (Python + FastAPI + Playwright + APScheduler)
- **FastAPI REST API** - 40+ endpoints for all frontend operations
- **Playwright Automation** - Full LinkedIn session warm-up, connection loop, acceptance checker, follow-up sender
- **APScheduler** - Cron jobs: weekly schedule generation (Mon 8AM), connection job (daily 9AM), checker (daily 2PM), second follow-ups (daily 3PM), email reports (daily 10PM IST)
- **Gemini AI** - Screenshot-based reply detection with sentiment analysis, locator suggestion on failures
- **Email Reports** - HTML daily reports via Gmail SMTP
- **Web Push Notifications** - VAPID-based push to paired devices
- **Encryption** - AES-256 for all stored credentials
- **JWT Device Tokens** - Secure pairing without passwords

### Database (Supabase PostgreSQL)
- **9 tables** fully implemented: config, campaigns, outreach_log, daily_schedule, locators, paired_devices, push_subscriptions, notification_log, blacklist
- **20 LinkedIn locators** pre-seeded with default CSS selectors
- **RLS policies** included (can be disabled if needed)

## Quick Start

1. Read `GUIDE.md` for complete setup instructions
2. Run `supabase_schema.sql` in your Supabase SQL Editor
3. Deploy backend to Railway (see Guide Section 4)
4. Deploy frontend to Netlify (see Guide Section 5)
5. Complete first-time setup via the web app
6. Install PWA on your phone and pair with 6-digit code

## File Structure

```
app/
├── backend/           # Python automation backend
│   ├── app.py         # FastAPI server + all routes
│   ├── automation.py  # Playwright LinkedIn engine
│   ├── scheduler.py   # APScheduler cron jobs
│   ├── gemini_ai.py   # Google Gemini integration
│   ├── email_reports.py
│   ├── push_notifications.py
│   ├── db_client.py
│   ├── config.py
│   ├── encryption.py
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── pages/         # React pages
│   ├── hooks/         # Auth hook
│   ├── lib/           # Supabase client
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── manifest.json  # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── supabase_schema.sql # Database schema
├── netlify.toml       # Netlify routing
├── vite.config.ts     # Vite + PWA plugin
├── requirements.txt   # Python deps (root)
├── .env.example       # Frontend env template
└── GUIDE.md           # Complete setup guide
```

## Environment Variables

### Frontend (.env)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_BACKEND_API_URL
- VITE_VAPID_PUBLIC_KEY

### Backend (.env)
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- ENCRYPTION_KEY (32 chars)
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- FRONTEND_URL
- GEMINI_API_KEY
- GMAIL_USER
- GMAIL_APP_PASSWORD
- TZ=Asia/Kolkata

## Daily Operation

The bot runs 24/7 automatically. You only need to act when:
- CAPTCHA detected -> Solve manually, click "Session Refreshed" in web app
- Session expired -> Re-login to LinkedIn, click "Session Refreshed"
- Want to pause/resume campaigns -> Use Campaign Manager
- Want to change settings -> Use Admin Panel

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui + Recharts |
| Backend | Python 3.11 + FastAPI + Playwright + APScheduler |
| Database | Supabase PostgreSQL |
| AI | Google Gemini 1.5 Flash |
| Hosting | Netlify (frontend) + Railway (backend) |
| PWA | Vite PWA Plugin + Web Push API |
| Auth | JWT device tokens (no passwords) |

## Compliance & Safety

- No LinkedIn password stored anywhere
- Default delays: 120-240 seconds
- Max 25 connection requests/day hard cap
- Random 5 out of 7 days scheduling
- Warm-up mode for new accounts (5 -> 10 -> 15 -> 25/day over 4 weeks)
- Human-like typing with 50-200ms keystroke delays
- CAPTCHA detection with immediate stop + push notification
- Privacy wall detection and auto-skip
- Blacklist support for profiles and companies

---

**Document Version**: 2.0 | **Stack**: 100% Free | **User**: Single Personal Account
