-- CreateTable: DataRequest
CREATE TABLE IF NOT EXISTS "DataRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DataRequest_userId_idx" ON "DataRequest"("userId");
CREATE INDEX IF NOT EXISTS "DataRequest_status_idx" ON "DataRequest"("status");
