CREATE TABLE "SharedLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "password" TEXT,
  "expiresAt" DATETIME,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SharedLink_userId_idx" ON "SharedLink"("userId");
CREATE INDEX "SharedLink_assetId_idx" ON "SharedLink"("assetId");
CREATE UNIQUE INDEX "SharedLink_token_key" ON "SharedLink"("token");
