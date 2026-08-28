CREATE TABLE "CreativeComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "parentId" TEXT,
  "body" TEXT NOT NULL,
  "mentions" TEXT NOT NULL DEFAULT '[]',
  "resolved" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "CreativeComment_userId_idx" ON "CreativeComment"("userId");
CREATE INDEX "CreativeComment_assetId_idx" ON "CreativeComment"("assetId");
