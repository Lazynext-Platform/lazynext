-- CreateTable
CREATE TABLE IF NOT EXISTS "Timeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "creationId" TEXT,
    "name" TEXT NOT NULL,
    "durationSec" REAL NOT NULL DEFAULT 0,
    "fps" INTEGER NOT NULL DEFAULT 30,
    "ratio" TEXT NOT NULL DEFAULT '16:9',
    "tracksJson" TEXT NOT NULL DEFAULT '[]',
    "markersJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Timeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Timeline_creationId_fkey" FOREIGN KEY ("creationId") REFERENCES "Creation" ("id") ON DELETE SET NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timeline_userId_idx" ON "Timeline"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timeline_creationId_idx" ON "Timeline"("creationId");
