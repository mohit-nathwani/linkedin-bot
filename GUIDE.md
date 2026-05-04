# LinkedIn Outreach Bot - Complete Setup & Deployment Guide

## Table of Contents
1. [Prerequisites & How to Fix Them](#1-prerequisites--how-to-fix-them)
2. [Account Creation Checklist](#2-account-creation-checklist)
3. [Supabase Database Setup](#3-supabase-database-setup)
4. [Backend Deployment (Railway)](#4-backend-deployment-railway)
5. [Frontend Deployment (Netlify)](#5-frontend-deployment-netlify)
6. [Gmail App Password Setup](#6-gmail-app-password-setup)
7. [First-Time App Setup](#7-first-time-app-setup)
8. [PWA Installation on Phone](#8-pwa-installation-on-phone)
9. [Device Pairing](#9-device-pairing)
10. [Running Locally (Development)](#10-running-locally-development)
11. [Troubleshooting](#11-troubleshooting)
12. [File Structure Reference](#12-file-structure-reference)

---

## 1. Prerequisites & How to Fix Them

### Required Accounts (All Free)
| Service | Purpose | Free Tier | Sign Up URL |
|---------|---------|-----------|-------------|
| Netlify | Host frontend web app + PWA | Unlimited hobby tier | netlify.com |
| Railway | Host Python backend 24/7 | 500 hrs/month free | railway.app |
| Supabase | PostgreSQL database | 500MB DB | supabase.com |
| Google AI Studio | Gemini API for AI reply reading | Free tier generous | aistudio.google.com |
| Gmail | SMTP for daily email reports | Free | gmail.com |
| GitHub | Code repository + auto-deploy | Free | github.com |

### How to Fix Missing Prerequisites

**No GitHub account?**
- Go to github.com, click "Sign up", verify email, done.

**No Supabase account?**
- Go to supabase.com, click "Start your project", sign in with GitHub.

**No Netlify account?**
- Go to netlify.com, click "Sign up", use GitHub login.

**No Railway account?**
- Go to railway.app, click "Login", use GitHub login.

**No Google AI Studio access?**
- Go to aistudio.google.com, sign in with Google account, click "Get API key" in the top right.

---

## 2. Account Creation Checklist

Do these in order:

1. **GitHub**: Create account, create a new private repository called `linkedin-outreach-bot`
2. **Supabase**: Create new project, note the Project URL and both API keys (anon + service_role)
3. **Netlify**: Link your GitHub account in settings
4. **Railway**: Link your GitHub account in settings
5. **Gmail**: Ensure you have a Gmail account with 2-Step Verification enabled
6. **Google AI Studio**: Generate a Gemini API key, copy it

---

## 3. Supabase Database Setup

This is the foundation. Do this first.

### Step 3.1: Create Project
1. Log into supabase.com
2. Click "New Project"
3. Choose your organization, name it `linkedin-bot`
4. Set a database password (save this somewhere safe)
5. Choose region closest to you (US East recommended)
6. Wait 2-3 minutes for provisioning

### Step 3.2: Run Schema SQL
1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Open the file `supabase_schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click "Run"
6. You should see green checkmarks for all tables created

### Step 3.3: Get API Keys
1. Go to Project Settings (gear icon) -> API
2. Copy these values and save them:
   - **Project URL** (e.g., `https://abcdefgh12345678.supabase.co`)
   - **anon public key** (starts with `eyJhbG...`)
   - **service_role key** (starts with `eyJhbG...`) - this one is SECRET

### Step 3.4: Fix RLS Policies (if needed)
If you get "permission denied" errors later, go to SQL Editor and run:
```sql
ALTER TABLE config DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE locators DISABLE ROW LEVEL SECURITY;
ALTER TABLE paired_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist DISABLE ROW LEVEL SECURITY;
```

---

## 4. Backend Deployment (Railway)

### Step 4.1: Prepare Code
1. Create a new folder on your machine
2. Copy the `backend/` folder from this project into it
3. Copy `backend/requirements.txt` to the root
4. Copy `backend/.env.example` to the root and rename it to `.env`
5. Fill in the `.env` with your actual values

### Step 4.2: Generate VAPID Keys (for Web Push)
Run this command on your local machine (requires Python):
```bash
pip install py-vapid
vapid --gen
```
This creates `private_key.pem` and `public_key.pem`. Copy the contents:
- Public key goes to `VAPID_PUBLIC_KEY`
- Private key goes to `VAPID_PRIVATE_KEY`

If you can't run the command, use this online generator: `https://web-push-codelab.glitch.me/` and copy the keys.

### Step 4.3: Generate ENCRYPTION_KEY
This must be exactly 32 characters. Generate one:
```bash
python -c "import secrets; print(secrets.token_hex(16))"
```
Copy the output to `ENCRYPTION_KEY` in `.env`

### Step 4.4: Deploy to Railway
1. Push your backend code to GitHub in a separate repo or folder
2. Go to railway.app, click "New Project"
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Python. If not, go to Settings -> Build -> Set root directory to `/`
6. In Railway dashboard, click "Variables" and add ALL environment variables from your `.env`
7. Click "Deploy"
8. After deployment, click "Settings" -> "Networking" -> "Generate Domain"
9. Copy the Railway domain (e.g., `https://linkedin-bot-api.up.railway.app`)
10. Save this domain - you'll need it for the frontend

### Step 4.5: Install Playwright on Railway
In Railway, you need to add a build command. Go to Settings -> Build:
- Build Command: `pip install -r requirements.txt && playwright install chromium`
- Start Command: `python backend/app.py`

Redeploy after changing these.

### Step 4.6: Verify Backend
Open your Railway URL + `/api/health` in a browser. You should see:
```json
{"status": "ok", "time": "2024-..."}
```

---

## 5. Frontend Deployment (Netlify)

### Step 5.1: Prepare Frontend Code
1. Go to the `app/` folder (the React project)
2. Create `.env` file in the root using `.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_API_URL=https://your-railway-app.up.railway.app
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### Step 5.2: Build & Deploy
**Option A: GitHub + Auto-deploy (Recommended)**
1. Push the `app/` folder to a GitHub repository
2. Go to netlify.com, click "Add new site" -> "Import an existing project"
3. Select your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy Site"
6. Netlify gives you a URL (e.g., `https://linkedin-reach.netlify.app`)

**Option B: Drag-and-Drop (Quick fix)**
1. Run `npm install` then `npm run build` locally
2. A `dist/` folder is created
3. In Netlify dashboard, drag and drop the `dist/` folder
4. Instant deploy

### Step 5.3: Add Custom Domain (Optional)
In Netlify -> Domain settings, add your custom domain or keep the `.netlify.app` URL.

### Step 5.4: Verify Frontend
Open your Netlify URL. You should see the Setup screen (if Supabase config row doesn't have setup_complete=true yet).

---

## 6. Gmail App Password Setup

This is required for daily email reports.

1. Go to myaccount.google.com
2. Click "Security" in the left sidebar
3. Under "Signing in to Google", ensure **2-Step Verification is ON**
   - If it's OFF, click it and set it up with your phone
4. After 2-Step is ON, go back to Security
5. Search for "App passwords" (or scroll down)
6. Click "App passwords"
7. Select app: "Mail"
8. Select device: "Other (custom name)"
9. Name it: `LinkedIn Bot`
10. Click "Generate"
11. **Copy the 16-character code** that appears (no spaces)
12. This code goes into the app's First-Time Setup screen as "Gmail App Password"

**IMPORTANT**: Your real Gmail password is NEVER used. Only this 16-char app password is used.

---

## 7. First-Time App Setup

Once both frontend and backend are deployed:

1. Open your Netlify URL
2. You will see the "Welcome to LinkedIn Outreach Bot" setup screen
3. Fill in all fields:
   - **App Name**: Whatever you want to call it
   - **Logo URL**: Paste a public image URL (or leave blank)
   - **Colors**: Pick your theme colors
   - **Report Email**: Your Gmail address
   - **Gmail App Password**: The 16-char code from Section 6
   - **Gemini API Key**: From aistudio.google.com
   - **Supabase URL**: Your project URL
4. Click "Save & Continue"
5. The app will reload and show the Dashboard

---

## 8. PWA Installation on Phone

**Android (Chrome):**
1. Open your Netlify URL in Chrome on your phone
2. You will see a banner at the bottom: "Add LinkedReach to Home screen"
3. Tap it, then tap "Add"
4. The app icon appears on your home screen

**iOS (Safari):**
1. Open your Netlify URL in Safari
2. Tap the Share button (rectangle with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**What makes it work:**
- The `public/manifest.json` file defines the app name, icons, and theme
- Netlify auto-serves this over HTTPS
- `vite-plugin-pwa` in `vite.config.ts` generates the service worker

---

## 9. Device Pairing

This links your phone PWA to your account without a second login.

1. On Desktop Web App: Go to Dashboard -> click "Pair" button (or go to `/admin` -> Paired Devices tab)
2. Click "Generate New Pairing Code"
3. A 6-digit code appears (e.g., 482917)
4. On your phone: Open the PWA (or the URL in Safari/Chrome)
5. You see the "Pair Your Device" screen
6. Type the 6-digit code
7. Tap "Pair Device"
8. Your phone is now permanently linked

**To Unpair:**
- Go to Admin Panel -> Paired Devices -> Click "Unpair" next to any device

---

## 10. Running Locally (Development)

### Backend Local
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
# Create .env file with all variables
python app.py
```
Backend runs at `http://localhost:8000`

### Frontend Local
```bash
cd app
npm install
# Create .env with VITE_BACKEND_API_URL=http://localhost:8000
npm run dev
```
Frontend runs at `http://localhost:3000`

---

## 11. Troubleshooting

### "Failed to fetch" or "Network Error"
- Check that `VITE_BACKEND_API_URL` in frontend `.env` matches your Railway URL exactly
- Check that Railway app is running (not sleeping on free tier)
- Check CORS: `FRONTEND_URL` in backend `.env` must match your Netlify URL

### "Permission denied" on Supabase
- Run the RLS disable SQL from Section 3.4
- Or use the Service Role key instead of Anon key for backend

### Playwright not found on Railway
- Ensure build command includes `playwright install chromium`
- Or add a Dockerfile with Chromium pre-installed

### Emails not sending
- Verify Gmail App Password is correct (16 chars, no spaces)
- Verify 2-Step Verification is ON for that Gmail account
- Check `GMAIL_USER` in backend `.env` matches the email address

### CAPTCHA keeps triggering
- Increase `min_delay_seconds` and `max_delay_seconds` in campaign settings
- Enable Warm-Up Mode for new accounts
- Ensure you're not running multiple campaigns in one day

### Session expires too often
- This is normal (every 2-6 weeks)
- When you get the push notification, log into LinkedIn manually
- Click "Session Refreshed - Resume" in the Admin Panel

### PWA not showing "Add to Home Screen"
- Must be served over HTTPS (Netlify does this automatically)
- Must visit the site at least twice
- On iOS, must use Safari (not Chrome)

---

## 12. File Structure Reference

```
/mnt/agents/output/app/
├── backend/
│   ├── app.py                  # FastAPI server + all API routes
│   ├── automation.py           # Playwright LinkedIn automation engine
│   ├── scheduler.py            # APScheduler cron jobs
│   ├── gemini_ai.py            # Google Gemini AI reply detection
│   ├── email_reports.py        # Daily 10 PM email reports via Gmail SMTP
│   ├── push_notifications.py  # Web Push API for PWA alerts
│   ├── db_client.py            # Supabase client initialization
│   ├── config.py               # Environment variable loader
│   ├── encryption.py           # AES-256 encryption for stored secrets
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Backend environment variables template
├── src/
│   ├── pages/
│   │   ├── Setup.tsx           # First-time configuration screen
│   │   ├── Dashboard.tsx       # Main dashboard with stats & charts
│   │   ├── Campaigns.tsx       # Campaign CRUD + delay warnings
│   │   ├── Admin.tsx           # Admin Panel (8 sections)
│   │   ├── OutreachLog.tsx     # Full outreach log with filters
│   │   ├── Notifications.tsx   # Push notification history
│   │   └── Pairing.tsx         # 6-digit code pairing screen (PWA)
│   ├── hooks/
│   │   └── useAuth.ts          # Device pairing & auth hook
│   ├── lib/
│   │   └── supabase.ts         # Supabase client + API URL
│   ├── App.tsx                 # React Router routes
│   └── main.tsx                # Entry point
├── public/
│   └── manifest.json           # PWA manifest
├── supabase_schema.sql         # Database schema (run in Supabase SQL Editor)
├── netlify.toml                # Netlify routing config
├── vite.config.ts              # Vite + PWA plugin config
├── .env.example                # Frontend environment variables template
└── GUIDE.md                    # This document
```

---

## Quick Start Checklist

- [ ] GitHub account created
- [ ] Supabase project created, schema SQL executed
- [ ] Railway account created
- [ ] Netlify account created
- [ ] Gemini API key generated
- [ ] Gmail App Password created
- [ ] VAPID keys generated
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Netlify
- [ ] First-time setup completed
- [ ] PWA installed on phone
- [ ] Phone paired with 6-digit code
- [ ] Test campaign created with LinkedIn search URL
- [ ] Manual session login done (first time only)

---

## Daily Operation

**You do NOT need to do anything daily.** The bot runs automatically:
- 9:00 AM IST: Connection requests sent
- 2:00 PM IST: Acceptance check + follow-ups
- 3:00 PM IST: Second follow-ups (if 7 days passed)
- 10:00 PM IST: Daily email report

**You only need to act when:**
- You get a push notification saying "CAPTCHA detected" -> Solve it on LinkedIn, then click "Session Refreshed - Resume" in web app
- You get "Session Expired" -> Log into LinkedIn manually, then click "Session Refreshed - Resume"
- You want to pause/resume a campaign -> Use Campaign Manager
- You want to change delays or locators -> Use Admin Panel

---

**End of Guide. Your LinkedIn Outreach Bot is ready to deploy.**
