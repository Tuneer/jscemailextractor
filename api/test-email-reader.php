<?php
/**
 * Test script for email reader functionality
 * Access via: https://yourdomain.com/api/test-email-reader.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<pre>";
echo "=== Email Reader Test ===\n\n";

// Load configuration
require_once __DIR__ . '/email_helper.php';

// 1. Test IMAP Configuration
echo "1. IMAP Configuration:\n";
echo "   Host: " . $email_config['imap_host'] . "\n";
echo "   User: " . $email_config['imap_user'] . "\n";
echo "   Password: " . (empty($email_config['imap_password']) ? 'NOT SET' : '[SET - ' . strlen($email_config['imap_password']) . ' chars]') . "\n\n";

// 2. Test IMAP Connection
echo "2. IMAP Connection Test:\n";
$mailbox = $email_config['imap_host'];
$username = $email_config['imap_user'];
$password = $email_config['imap_password'];

$inbox = @imap_open($mailbox, $username, $password);
if (!$inbox) {
    $error = imap_last_error();
    echo "   Status: FAILED\n";
    echo "   Error: " . ($error ?: 'Unknown error') . "\n";
    echo "\nTroubleshooting:\n";
    echo "   - Check if IMAP is enabled in Gmail settings\n";
    echo "   - Check if 2FA is enabled and app password is correct\n";
    echo "   - Check if 'Less secure apps' is enabled (if not using app password)\n";
} else {
    echo "   Status: SUCCESS\n\n";
    
    // 3. Search for emails
    echo "3. Email Search Test:\n";
    $emails = imap_search($inbox, 'ALL', SE_UID);
    if (!$emails) {
        $error = imap_last_error();
        echo "   Total emails: 0\n";
        echo "   Error: " . ($error ?: 'None') . "\n";
    } else {
        echo "   Total emails in inbox: " . count($emails) . "\n\n";
        
        // 4. Check first 5 emails for attachments
        echo "4. Checking first 5 emails for attachments:\n";
        $emails = array_slice($emails, 0, 5);
        
        foreach ($emails as $emailUid) {
            $overview = imap_fetch_overview($inbox, $emailUid, FT_UID);
            $structure = imap_fetchstructure($inbox, $emailUid, FT_UID);
            
            $subject = $overview[0]->subject ?? 'No Subject';
            $from = $overview[0]->from ?? 'Unknown';
            
            // Check for attachments
            $hasAttachment = hasAttachmentsInStructure($structure);
            $attachmentInfo = [];
            
            if (isset($structure->parts)) {
                $attachmentInfo = getAttachmentsInfo($inbox, $emailUid, $structure->parts);
            }
            
            echo "\n   Email UID: $emailUid\n";
            echo "   Subject: " . mb_substr($subject, 0, 50) . (strlen($subject) > 50 ? '...' : '') . "\n";
            echo "   From: $from\n";
            echo "   Has attachment: " . ($hasAttachment ? 'YES' : 'NO') . "\n";
            
            if (!empty($attachmentInfo)) {
                echo "   Attachments found: " . count($attachmentInfo) . "\n";
                foreach ($attachmentInfo as $att) {
                    echo "     - " . $att['filename'] . " (" . $att['content_type'] . ", " . $att['size'] . " bytes)\n";
                }
            }
            
            // Show structure details for debugging
            if (isset($structure->parts)) {
                echo "   Structure: " . count($structure->parts) . " parts\n";
                foreach ($structure->parts as $idx => $part) {
                    $disposition = $part->disposition ?? 'none';
                    $subtype = $part->subtype ?? 'unknown';
                    $hasDparams = !empty($part->dparameters) ? 'YES' : 'NO';
                    echo "     Part $idx: disposition='$disposition', subtype='$subtype', dparameters=$hasDparams\n";
                }
            } else {
                echo "   Structure: single part\n";
            }
        }
    }
    
    imap_close($inbox);
}

// 5. Test fetchEmails function
echo "\n\n5. Testing fetchEmails() function:\n";
$testEmails = fetchEmails(5, ['query' => 'has:attachment']);
if (empty($testEmails)) {
    echo "   Result: No emails returned\n";
    echo "   Check PHP error log for details\n";
} else {
    echo "   Result: " . count($testEmails) . " emails with attachments\n";
    foreach ($testEmails as $email) {
        echo "   - UID {$email['uid']}: " . mb_substr($email['subject'], 0, 40) . " (attachments: " . count($email['attachments']) . ")\n";
    }
}

echo "\n\n=== Test Complete ===\n";
echo "</pre>";
