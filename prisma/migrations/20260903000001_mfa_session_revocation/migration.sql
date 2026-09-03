-- Migration: MFA + Session Revocation
-- Date: 2026-09-03
-- Adds mfaSecret, mfaEnabled to User; revokedAt, index to Session.

-- Add MFA fields to User
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT 0;

-- Add revocation support to Session
ALTER TABLE "Session" ADD COLUMN "revokedAt" DATETIME;

-- Add index on Session.userId for revocation lookups
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
