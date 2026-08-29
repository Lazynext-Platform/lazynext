-- CreateTable
CREATE TABLE "TeamActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TeamActivity_teamId_createdAt_idx" ON "TeamActivity"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamActivity_userId_idx" ON "TeamActivity"("userId");

-- AddForeignKey
ALTER TABLE "TeamActivity" ADD CONSTRAINT "TeamActivity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamActivity" ADD CONSTRAINT "TeamActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
