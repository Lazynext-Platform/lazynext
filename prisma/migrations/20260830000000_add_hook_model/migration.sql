-- CreateTable
CREATE TABLE IF NOT EXISTS "Hook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "performanceScore" INTEGER NOT NULL,
    "productOrBrand" TEXT,
    "audience" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Hook_userId_idx" ON "Hook"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Hook_userId_trigger_idx" ON "Hook"("userId", "trigger");
