-- Migration: Add email column to profiles table
-- Purpose: Store login email alongside username for display in admin UI

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
