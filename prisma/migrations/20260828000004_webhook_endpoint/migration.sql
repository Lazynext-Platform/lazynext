CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "lastFiredAt" DATETIME,
  "lastStatus" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "WebhookEndpoint_userId_idx" ON "WebhookEndpoint"("userId");
