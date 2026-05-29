<?php
/**
 * Test Environment Configuration
 * This file checks if .env variables are loaded correctly
 */

// Load .env file if it exists
$envFile = __DIR__ . '/.env';
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

// JWT Configuration
$jwt_secret = getenv('JWT_SECRET') ?: 'emailextractor2655-secret-key';

// Admin Configuration
$ADMIN_EMAIL = getenv('ADMIN_EMAIL') ?: 'admin@jscemailextractor.com';
$ADMIN_OTP = getenv('ADMIN_OTP') ?: '123456';

// Load database functions
require_once __DIR__ . '/db.php';

header('Content-Type: text/plain');

echo "=== Environment Variables Test ===\n\n";

// Check database config
global $db_config;
echo "Database Configuration:\n";
echo "- DB_HOST: " . (isset($db_config['host']) ? $db_config['host'] : 'NOT DEFINED') . "\n";
echo "- DB_NAME: " . (isset($db_config['name']) ? $db_config['name'] : 'NOT DEFINED') . "\n";
echo "- DB_USER: " . (isset($db_config['user']) ? $db_config['user'] : 'NOT DEFINED') . "\n";
echo "- DB_PASSWORD: " . (isset($db_config['pass']) ? '[SET]' : 'NOT DEFINED') . "\n\n";

// Check JWT secret
echo "JWT Configuration:\n";
echo "- JWT Secret: " . (!empty($jwt_secret) ? '[SET]' : 'NOT DEFINED') . "\n\n";

// Check email configuration
echo "Email Configuration:\n";
echo "- EMAIL_USER: " . (isset($email_config['imap_user']) ? $email_config['imap_user'] : 'NOT DEFINED') . "\n";
echo "- EMAIL_PASSWORD: " . (isset($email_config['imap_password']) ? '[SET]' : 'NOT DEFINED') . "\n";
echo "- EMAIL_HOST: " . (isset($email_config['smtp_host']) ? $email_config['smtp_host'] : 'NOT DEFINED') . "\n";
echo "- EMAIL_PORT: " . (isset($email_config['smtp_port']) ? $email_config['smtp_port'] : 'NOT DEFINED') . "\n\n";

// Check Gmail configuration
echo "Gmail Configuration:\n";
echo "- GMAIL_USER: " . (isset($email_config['imap_user']) ? $email_config['imap_user'] : 'NOT DEFINED') . "\n";
echo "- GMAIL_APP_PASSWORD: " . (isset($email_config['imap_password']) ? '[SET]' : 'NOT DEFINED') . "\n\n";

// Check admin credentials
echo "Admin Configuration:\n";
echo "- ADMIN_EMAIL: " . (isset($ADMIN_EMAIL) ? $ADMIN_EMAIL : 'NOT DEFINED') . "\n";
echo "- ADMIN_OTP: " . (isset($ADMIN_OTP) ? $ADMIN_OTP : 'NOT DEFINED') . "\n\n";

// Check attachments directory
echo "Attachments Directory:\n";
$attachmentsDir = __DIR__ . '/attachments/';
if (!is_dir($attachmentsDir)) {
    echo "- Directory: NOT EXISTS\n";
    echo "- Attempting to create...\n";
    if (mkdir($attachmentsDir, 0777, true)) {
        echo "- Created: SUCCESS\n";
    } else {
        echo "- Created: FAILED\n";
    }
} else {
    echo "- Directory: EXISTS\n";
    echo "- Writable: " . (is_writable($attachmentsDir) ? 'YES' : 'NO') . "\n";
    echo "- Permissions: " . substr(sprintf('%o', fileperms($attachmentsDir)), -4) . "\n";
}
echo "\n";

// Test database connection
echo "=== Database Connection Test ===\n";
try {
    $db = getDB();
    echo "✓ Database connection successful!\n";
    
    // Test query
    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $result = $stmt->fetch();
    echo "- Users in database: " . $result['count'] . "\n";
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM email_automation");
    $result = $stmt->fetch();
    echo "- Emails in database: " . $result['count'] . "\n";
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM email_attachments");
    $result = $stmt->fetch();
    echo "- Attachments in database: " . $result['count'] . "\n";
    
    // Check emails with attachment_count > 0 but no attachments in email_attachments table
    $stmt = $db->query("SELECT ea.id, ea.subject, ea.attachment_count FROM email_automation ea LEFT JOIN email_attachments att ON ea.id = att.email_id WHERE ea.attachment_count > 0 AND att.id IS NULL");
    $orphanEmails = $stmt->fetchAll();
    if (count($orphanEmails) > 0) {
        echo "- WARNING: " . count($orphanEmails) . " emails have attachment_count > 0 but no attachments in email_attachments table\n";
        foreach ($orphanEmails as $email) {
            echo "  - Email ID " . $email['id'] . ": '" . $email['subject'] . "' (count: " . $email['attachment_count'] . ")\n";
        }
    }
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM cron_job_logs");
    $result = $stmt->fetch();
    echo "- Cron job logs: " . $result['count'] . "\n";
    
} catch (Exception $e) {
    echo "✗ Database connection failed: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
