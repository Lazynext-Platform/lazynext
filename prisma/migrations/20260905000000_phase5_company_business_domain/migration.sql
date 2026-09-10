-- Phase 5: Company Business Domain Models
-- Additive migration: creates 5 new tables (Product, Customer, Initiative, Deal, Transaction)
-- No destructive changes to existing tables

-- Product: products/services offered by the company
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'product',
    "status" TEXT NOT NULL DEFAULT 'active',
    "price" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unit" TEXT,
    "sku" TEXT,
    "category" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE,
    "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE SET NULL
);

-- Customer: CRM customers and leads
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "type" TEXT NOT NULL DEFAULT 'lead',
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT,
    "value" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "ownerId" TEXT,
    "lastContactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE,
    "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE SET NULL
);

-- Initiative: cross-functional efforts spanning multiple goals/plans
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "budget" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ownerId" TEXT,
    "goalIds" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE,
    "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE SET NULL
);

-- Deal: sales pipeline opportunities
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "value" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expectedCloseDate" DATETIME,
    "actualCloseDate" DATETIME,
    "ownerId" TEXT,
    "source" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE,
    "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE SET NULL,
    "customerId" TEXT REFERENCES "Customer"("id") ON DELETE CASCADE,
    "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL
);

-- Transaction: financial transactions (income, expense, transfer)
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "source" TEXT,
    "reference" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE,
    "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE SET NULL
);

-- Indexes
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");
CREATE INDEX "Product_workspaceId_idx" ON "Product"("workspaceId");
CREATE INDEX "Product_status_idx" ON "Product"("status");

CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX "Customer_workspaceId_idx" ON "Customer"("workspaceId");
CREATE INDEX "Customer_status_idx" ON "Customer"("status");
CREATE INDEX "Customer_type_idx" ON "Customer"("type");
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

CREATE INDEX "Initiative_organizationId_idx" ON "Initiative"("organizationId");
CREATE INDEX "Initiative_workspaceId_idx" ON "Initiative"("workspaceId");
CREATE INDEX "Initiative_status_idx" ON "Initiative"("status");

CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");
CREATE INDEX "Deal_workspaceId_idx" ON "Deal"("workspaceId");
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");
CREATE INDEX "Deal_ownerId_idx" ON "Deal"("ownerId");

CREATE INDEX "Transaction_organizationId_idx" ON "Transaction"("organizationId");
CREATE INDEX "Transaction_workspaceId_idx" ON "Transaction"("workspaceId");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
