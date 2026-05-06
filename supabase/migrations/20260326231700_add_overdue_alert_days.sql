-- Add overdue_alert_days column to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS overdue_alert_days INTEGER DEFAULT 30;
