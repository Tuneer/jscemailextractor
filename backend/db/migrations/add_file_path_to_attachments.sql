-- Migration: Add file_path column to email_attachments table
-- Run this SQL on your server database

ALTER TABLE email_attachments 
ADD COLUMN file_path VARCHAR(500) AFTER size;

-- Verify the column was added
DESCRIBE email_attachments;
