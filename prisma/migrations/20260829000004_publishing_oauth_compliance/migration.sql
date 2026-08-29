-- Custom compliance rules (user-defined, per-platform)
CREATE TABLE "CustomComplianceRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "keywordsJson" TEXT NOT NULL DEFAULT '[]',
  "recommendation" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomComplianceRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "CustomComplianceRule_userId_idx" ON "CustomComplianceRule"("userId");
CREATE INDEX "CustomComplianceRule_platform_idx" ON "CustomComplianceRule"("platform");
CREATE INDEX "CustomComplianceRule_enabled_idx" ON "CustomComplianceRule"("enabled");

-- Publishing: OAuth platform connections
CREATE TABLE "PlatformConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "tokenExpiresAt" DATETIME,
  "platformUserId" TEXT,
  "platformUsername" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PlatformConnection_userId_platform_key" ON "PlatformConnection"("userId", "platform");
CREATE INDEX "PlatformConnection_userId_idx" ON "PlatformConnection"("userId");
CREATE INDEX "PlatformConnection_platform_idx" ON "PlatformConnection"("platform");

-- Publishing: scheduled posts
CREATE TABLE "ScheduledPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "hashtagsJson" TEXT NOT NULL DEFAULT '[]',
  "privacyLevel" TEXT,
  "crossPostToJson" TEXT NOT NULL DEFAULT '[]',
  "postUrl" TEXT,
  "postId" TEXT,
  "scheduledAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "ScheduledPost_userId_idx" ON "ScheduledPost"("userId");
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");
CREATE INDEX "ScheduledPost_scheduledAt_idx" ON "ScheduledPost"("scheduledAt");
