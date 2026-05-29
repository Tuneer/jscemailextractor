-- Migration: Add attachment_count column to email_automation table
-- This tracks how many attachments were processed for each email

ALTER TABLE email_automation 
ADD COLUMN IF NOT EXISTS attachment_count INT DEFAULT 0 
COMMENT 'Number of attachments processed' 
AFTER is_processed;
