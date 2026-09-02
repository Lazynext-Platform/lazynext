-- Add idempotencyKey column to CreditLedger for deduplicating pipeline stage charges.
-- Existing rows will have NULL idempotencyKey, which is allowed (non-pipeline charges don't use it).
ALTER TABLE "CreditLedger" ADD COLUMN "idempotencyKey" TEXT;

-- Create a unique index on (userId, idempotencyKey) so that duplicate charges
-- with the same key are rejected by the database, providing ledger-level idempotency.
-- SQLite/ISNULL: partial index to allow multiple NULL keys (existing rows).
CREATE UNIQUE INDEX "CreditLedger_userId_idempotencyKey_key" ON "CreditLedger"("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
