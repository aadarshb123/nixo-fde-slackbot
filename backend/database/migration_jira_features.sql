-- Migration: Add JIRA-lite features to issue_groups table
-- Date: 2025-01-24

-- Add new columns to issue_groups table
ALTER TABLE issue_groups
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'backlog';

-- Update existing status values to new workflow_status
-- Map old 'open' to 'backlog', 'resolved' to 'resolved'
UPDATE issue_groups 
SET workflow_status = CASE 
    WHEN status = 'open' THEN 'backlog'
    WHEN status = 'resolved' THEN 'resolved'
    WHEN status = 'closed' THEN 'closed'
    ELSE 'backlog'
END
WHERE workflow_status = 'backlog';

-- Add check constraints for valid values
ALTER TABLE issue_groups
ADD CONSTRAINT check_priority 
CHECK (priority IN ('critical', 'high', 'medium', 'low'));

ALTER TABLE issue_groups
ADD CONSTRAINT check_workflow_status 
CHECK (workflow_status IN ('backlog', 'todo', 'in_progress', 'blocked', 'resolved', 'closed'));

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_issue_groups_priority ON issue_groups(priority);
CREATE INDEX IF NOT EXISTS idx_issue_groups_workflow_status ON issue_groups(workflow_status);

-- Comments for documentation
COMMENT ON COLUMN issue_groups.priority IS 'Issue priority: critical, high, medium, low';
COMMENT ON COLUMN issue_groups.workflow_status IS 'Workflow status: backlog, todo, in_progress, blocked, resolved, closed';
