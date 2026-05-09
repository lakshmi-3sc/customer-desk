-- Add indexes to optimize KPI queries
-- These are the most frequently queried columns for the admin dashboard

-- Index for status queries (OPEN, IN_PROGRESS, RESOLVED counts)
CREATE INDEX IF NOT EXISTS idx_issue_status ON "Issue"("status");

-- Index for priority queries (CRITICAL count)
CREATE INDEX IF NOT EXISTS idx_issue_priority ON "Issue"("priority");

-- Index for SLA queries (slaBreached, slaBreachRisk counts)
CREATE INDEX IF NOT EXISTS idx_issue_sla_breached ON "Issue"("slaBreached");
CREATE INDEX IF NOT EXISTS idx_issue_sla_breach_risk ON "Issue"("slaBreachRisk");

-- Index for resolution time calculation (status + resolvedAt + createdAt)
CREATE INDEX IF NOT EXISTS idx_issue_resolved_time ON "Issue"("status", "resolvedAt", "createdAt");

-- Composite index for scoped queries (clientId + status)
CREATE INDEX IF NOT EXISTS idx_issue_client_status ON "Issue"("clientId", "status");

-- Index for active clients
CREATE INDEX IF NOT EXISTS idx_client_active ON "Client"("isActive");

-- Index for clientMember lookups (user association)
CREATE INDEX IF NOT EXISTS idx_client_member_user ON "ClientMember"("userId");
