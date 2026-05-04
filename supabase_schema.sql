-- Supabase PostgreSQL Schema for LinkedIn Outreach Bot
-- Run this in the Supabase SQL Editor

-- Config table (single row)
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    app_name VARCHAR(255) DEFAULT 'LinkedReach',
    app_logo_url TEXT,
    primary_color VARCHAR(10) DEFAULT '#1F4E79',
    secondary_color VARCHAR(10) DEFAULT '#4A90D9',
    report_email VARCHAR(255),
    gmail_app_password VARCHAR(255),
    gemini_api_key VARCHAR(255),
    supabase_url VARCHAR(255),
    vapid_public_key TEXT,
    vapid_private_key TEXT,
    setup_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bot_status VARCHAR(50) DEFAULT 'Idle',
    session_paused BOOLEAN DEFAULT FALSE,
    captcha_detected BOOLEAN DEFAULT FALSE,
    session_expired BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_session_refresh TIMESTAMP WITH TIME ZONE,
    notif_captcha BOOLEAN DEFAULT TRUE,
    notif_session_expired BOOLEAN DEFAULT TRUE,
    notif_campaign_complete BOOLEAN DEFAULT TRUE,
    notif_daily_summary BOOLEAN DEFAULT TRUE,
    notif_locator_fail BOOLEAN DEFAULT TRUE
);

-- Insert default row
INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    linkedin_search_url TEXT NOT NULL,
    connection_draft TEXT,
    connection_draft_b TEXT,
    connection_draft_c TEXT,
    followup_draft TEXT,
    second_followup_draft TEXT,
    daily_target_avg INTEGER DEFAULT 20,
    daily_max INTEGER DEFAULT 25,
    min_delay_seconds INTEGER DEFAULT 120,
    max_delay_seconds INTEGER DEFAULT 240,
    delay_warning_acknowledged BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    total_sent INTEGER DEFAULT 0,
    total_accepted INTEGER DEFAULT 0,
    total_replied INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_run_at TIMESTAMP WITH TIME ZONE,
    warm_up_mode BOOLEAN DEFAULT FALSE
);

-- Outreach log table
CREATE TABLE IF NOT EXISTS outreach_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    profile_url TEXT NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    current_title TEXT,
    connection_sent_at TIMESTAMP WITH TIME ZONE,
    note_sent BOOLEAN DEFAULT FALSE,
    note_content TEXT,
    connection_accepted BOOLEAN,
    accepted_at TIMESTAMP WITH TIME ZONE,
    followup_sent BOOLEAN DEFAULT FALSE,
    followup_sent_at TIMESTAMP WITH TIME ZONE,
    followup_content TEXT,
    second_followup_sent BOOLEAN DEFAULT FALSE,
    second_followup_sent_at TIMESTAMP WITH TIME ZONE,
    reply_detected BOOLEAN DEFAULT FALSE,
    reply_summary TEXT,
    reply_sentiment VARCHAR(20),
    reply_checked_at TIMESTAMP WITH TIME ZONE,
    day_batch DATE,
    status VARCHAR(30) DEFAULT 'sent',
    connect_btn_path VARCHAR(20),
    skip_reason TEXT,
    draft_variant VARCHAR(5) DEFAULT 'A'
);

-- Daily schedule table
CREATE TABLE IF NOT EXISTS daily_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    scheduled_days TEXT[] DEFAULT '{}',
    daily_targets JSONB DEFAULT '{}',
    actual_sent JSONB DEFAULT '{}',
    campaign_rotation JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locators table
CREATE TABLE IF NOT EXISTS locators (
    name VARCHAR(50) PRIMARY KEY,
    css_selector TEXT,
    xpath TEXT,
    description TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default locators
INSERT INTO locators (name, css_selector, xpath, description) VALUES
('profile_first_name', 'h1', null, 'First name on public profile page'),
('profile_last_name', 'h1', null, 'Last name on public profile page'),
('profile_current_title', '.text-body-medium', null, 'Current job title on profile'),
('connect_btn_main', 'button[aria-label*="Connect"]', null, 'Connect button directly on profile'),
('more_btn', 'button[aria-label="More actions"]', null, 'More options button'),
('connect_in_more_dropdown', '.artdeco-dropdown__item:has-text("Connect")', null, 'Connect option inside More dropdown'),
('add_note_btn', 'button[aria-label="Add a note"]', null, 'Add a note button in connection dialog'),
('note_textarea', 'textarea[id*="custom-message"]', null, 'Text area inside connection dialog'),
('send_with_note_btn', 'button[aria-label="Send invitation"]', null, 'Send button after note is typed'),
('send_without_note_btn', 'button[aria-label="Send without a note"]', null, 'Send without note button'),
('next_page_btn', 'button[aria-label="Next"]', null, 'Next page in search results'),
('connection_1st_badge', '.pv-top-card__distance-badge:has-text("1st")', null, '1st degree label on accepted profile'),
('message_btn', 'button[aria-label*="Message"]', null, 'Message button on accepted profile'),
('message_textarea', '.msg-form__contenteditable', null, 'Text input in LinkedIn messaging'),
('message_send_btn', 'button[type="submit"]', null, 'Send button inside messaging'),
('search_result_card', '.reusable-search__result-container', null, 'Each profile card on the search results page'),
('profile_link_in_card', 'a.app-aware-link', null, 'Clickable profile link inside a search card'),
('captcha_indicator', '.captcha, .challenge', null, 'CAPTCHA or verification screen element'),
('session_expired_indicator', '.login__form, #email-or-phone', null, 'LinkedIn login page redirect detector'),
('message_thread_container', '.msg-s-message-list', null, 'Full message thread area for Gemini screenshot')
ON CONFLICT (name) DO NOTHING;

-- Paired devices table
CREATE TABLE IF NOT EXISTS paired_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_code VARCHAR(6),
    device_token TEXT,
    device_label VARCHAR(255),
    paired_at TIMESTAMP WITH TIME ZONE,
    code_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES paired_devices(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification log table
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50),
    message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    value TEXT NOT NULL,
    reason TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) policies - enable for all tables
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE locators ENABLE ROW LEVEL SECURITY;
ALTER TABLE paired_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (for backend with service key)
CREATE POLICY "Service role all access" ON config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON outreach_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON daily_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON locators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON paired_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON notification_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role all access" ON blacklist FOR ALL USING (true) WITH CHECK (true);
