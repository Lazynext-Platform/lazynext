CREATE TABLE "ApprovalStage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assetId" TEXT,
  "campaignId" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'creative_review',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewerId" TEXT,
  "note" TEXT,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME
);

CREATE INDEX "ApprovalStage_assetId_idx" ON "ApprovalStage"("assetId");
CREATE INDEX "ApprovalStage_campaignId_idx" ON "ApprovalStage"("campaignId");
CREATE INDEX "ApprovalStage_stage_idx" ON "ApprovalStage"("stage");
CREATE INDEX "ApprovalStage_status_idx" ON "ApprovalStage"("status");
