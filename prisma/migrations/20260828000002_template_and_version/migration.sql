-- CreateTable: TimelineVersion
CREATE TABLE "TimelineVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timelineId" TEXT NOT NULL,
    "versionNum" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "tracksJson" TEXT NOT NULL DEFAULT '[]',
    "markersJson" TEXT NOT NULL DEFAULT '[]',
    "durationSec" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineVersion_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "Timeline" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "TimelineVersion_timelineId_idx" ON "TimelineVersion"("timelineId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "TimelineVersion_timelineId_versionNum_key" ON "TimelineVersion"("timelineId", "versionNum");

-- CreateTable: CreativeTemplate
CREATE TABLE "CreativeTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreativeTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "CreativeTemplate_userId_idx" ON "CreativeTemplate"("userId");

-- CreateIndex
CREATE INDEX "CreativeTemplate_category_idx" ON "CreativeTemplate"("category");
