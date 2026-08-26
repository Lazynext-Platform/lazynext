-- Migration number: 0001 	 2026-08-25T23:55:13.498Z
-- Add password column for email+password authentication.
-- Nullable so existing OAuth-only users are unaffected.
ALTER TABLE "User" ADD COLUMN "password" TEXT;
