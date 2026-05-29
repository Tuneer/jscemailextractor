<?php
/**
 * Cron Job Script for Automatic Email Capture
 * 
 * Setup Instructions for cPanel:
 * 1. Go to cPanel > Cron Jobs
 * 2. Add a new cron job with the following command:
 *    /usr/bin/php /home/your_username/public_html/emailextractor/api/cron_fetch_emails.php
 * 3. Set the schedule (recommended: every 5-15 minutes)
 *    - Every 5 minutes: *5 * * * *
 *    - Every 15 minutes: *15 * * * *
 *    - Every hour: 0 * * * *
 * 
 * Or run manually via SSH:
 * php /path/to/api/cron_fetch_emails.php
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set timezone
date_default_timezone_set('America/Chicago');

// Define paths
$apiPath = __DIR__;
$logPath = $apiPath . '/logs';

// Load .env file if it exists
$envFile = $apiPath . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!empty($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

// Database Configuration - Load from environment or use defaults
$db_config = [
    'host' => getenv('DB_HOST') ?: 'localhost',
    'name' => getenv('DB_NAME') ?: 'jsc_emailextractor',
    'user' => getenv('DB_USER') ?: 'JSCTuneer',
    'pass' => getenv('DB_PASS') ?: 'Jsc@2655@1011'
];

// Email Configuration
$email_config = [
    'imap_host' => getenv('IMAP_HOST') ?: '{imap.gmail.com:993/imap/ssl}',
    'imap_user' => getenv('EMAIL_USER') ?: 'jsccouponreceipt@gmail.com',
    'imap_password' => getenv('EMAIL_PASSWORD') ?: 'tfjdprqkxldrqppv',
    'smtp_host' => getenv('SMTP_HOST') ?: 'smtp.gmail.com',
    'smtp_port' => getenv('SMTP_PORT') ?: 587,
    'smtp_user' => getenv('EMAIL_USER') ?: 'jsccouponreceipt@gmail.com',
    'smtp_password' => getenv('EMAIL_PASSWORD') ?: 'tfjdprqkxldrqppv'
];

// Create logs directory if not exists
if (!is_dir($logPath)) {
    mkdir($logPath, 0777, true);
}

// Create attachments directory if not exists
$attachmentsPath = $apiPath . '/attachments';
if (!is_dir($attachmentsPath)) {
    if (mkdir($attachmentsPath, 0777, true)) {
        logMessage("Created attachments directory: $attachmentsPath");
    } else {
        logMessage("Failed to create attachments directory: $attachmentsPath", 'ERROR');
    }
} else {
    // Ensure it's writable
    if (!is_writable($attachmentsPath)) {
        chmod($attachmentsPath, 0777);
        logMessage("Updated attachments directory permissions");
    }
}

// Log function
function logMessage($message, $type = 'INFO') {
    global $logPath;
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logPath . '/email_automation_' . date('Y-m-d') . '.log';
    $logEntry = "[$timestamp] [$type] $message\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Also output if running from command line
    if (php_sapi_name() === 'cli') {
        echo $logEntry;
    }
}

// Load configuration and services
require_once $apiPath . '/db.php';
require_once $apiPath . '/email_automation.php';

logMessage("=== Email Automation Cron Started ===");

// Log cron job start to database
$cronLogId = logCronJobStart('email_automation');
logMessage("Cron job logged with ID: $cronLogId");

// Initialize counters
$emailsProcessed = 0;
$emailsNew = 0;
$emailsDuplicate = 0;
$attachmentsSaved = 0;
$errorMessage = null;

try {
    // Configuration options
    $options = [
        'limit' => 50,              // Max emails to process per run
        'attachments_only' => true, // Only process emails with attachments
        'sender_email' => null      // Set to filter by sender, or null for all
    ];
    
    logMessage("Connecting to IMAP server...");
    logMessage("IMAP Host: " . $email_config['imap_host']);
    logMessage("IMAP User: " . $email_config['imap_user']);
    
    // Run the automation
    $result = runEmailAutomation($options);
    
    if ($result['success']) {
        $emailsProcessed = $result['count'];
        logMessage("Result message: " . ($result['message'] ?? 'No message'));
        logMessage("Successfully processed $emailsProcessed emails");
        
        // Process each email and track stats
        if (!empty($result['emails'])) {
            foreach ($result['emails'] as $email) {
                $subject = $email['subject'] ?? 'No Subject';
                $from = $email['from'] ?? 'Unknown';
                $attachmentsCount = count($email['attachments'] ?? []);
                
                // Check if email was new or duplicate
                if (isset($email['saved']) && $email['saved']['success']) {
                    if (!empty($email['saved']['existing'])) {
                        $emailsDuplicate++;
                        logMessage("DUPLICATE: '$subject' from '$from'");
                    } else {
                        $emailsNew++;
                        $attachmentsSaved += $attachmentsCount;
                        $savedAttachmentCount = $email['saved']['attachments_count'] ?? $attachmentsCount;
                        logMessage("NEW: '$subject' from '$from' with $attachmentsCount attachments (saved: $savedAttachmentCount)");
                    }
                }
                
                // Log attachment details
                if (!empty($email['attachments'])) {
                    foreach ($email['attachments'] as $attachment) {
                        logMessage("  - Attachment: {$attachment['filename']} ({$attachment['size']} bytes)");
                    }
                }
            }
        }
        
        logMessage("Summary: $emailsNew new, $emailsDuplicate duplicate, $attachmentsSaved attachments");
        
    } else {
        $errorMessage = $result['message'] ?? 'Unknown error';
        logMessage("Error: $errorMessage", 'ERROR');
        logMessage("Full result: " . json_encode($result), 'ERROR');
    }
    
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    logMessage("Exception: $errorMessage", 'ERROR');
    logMessage("Stack trace: " . $e->getTraceAsString(), 'ERROR');
}

// Log cron job completion to database
logCronJobComplete($cronLogId, [
    'status' => $errorMessage ? 'failed' : 'completed',
    'emails_processed' => $emailsProcessed,
    'emails_new' => $emailsNew,
    'emails_duplicate' => $emailsDuplicate,
    'attachments_saved' => $attachmentsSaved,
    'error_message' => $errorMessage
]);

logMessage("=== Email Automation Cron Completed ===");
logMessage("Results saved to database (Log ID: $cronLogId)");

// Output summary for CLI
if (php_sapi_name() === 'cli') {
    echo "\nSummary:\n";
    echo "- Emails processed: $emailsProcessed\n";
    echo "- New emails: $emailsNew\n";
    echo "- Duplicate emails: $emailsDuplicate\n";
    echo "- Attachments saved: $attachmentsSaved\n";
    echo "- Status: " . ($errorMessage ? "FAILED: $errorMessage" : 'SUCCESS') . "\n";
}
