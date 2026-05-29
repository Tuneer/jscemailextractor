<?php
/**
 * Test script to verify attachment handling
 * Run this to check if attachments are being saved correctly
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

echo "=== Attachment System Test ===\n\n";

// 1. Check attachments directory
$uploadDir = __DIR__ . '/attachments/';
echo "1. Attachments Directory Check:\n";
echo "   Path: $uploadDir\n";
if (is_dir($uploadDir)) {
    echo "   Status: EXISTS\n";
    echo "   Writable: " . (is_writable($uploadDir) ? 'YES' : 'NO') . "\n";
    echo "   Permissions: " . substr(sprintf('%o', fileperms($uploadDir)), -4) . "\n";
    $files = glob($uploadDir . '*');
    echo "   Files in directory: " . count($files) . "\n";
    if (count($files) > 0) {
        echo "   Sample files:\n";
        foreach (array_slice($files, 0, 5) as $file) {
            echo "     - " . basename($file) . " (" . filesize($file) . " bytes)\n";
        }
    }
} else {
    echo "   Status: NOT EXISTS\n";
    echo "   Attempting to create...\n";
    if (mkdir($uploadDir, 0777, true)) {
        echo "   Created: SUCCESS\n";
    } else {
        echo "   Created: FAILED\n";
    }
}
echo "\n";

// 2. Check database
echo "2. Database Check:\n";
try {
    $db = getDB();
    
    // Check if file_path column exists in email_attachments
    echo "   Checking email_attachments table structure...\n";
    $stmt = $db->query("DESCRIBE email_attachments");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "   Columns: " . implode(', ', $columns) . "\n";
    
    if (!in_array('file_path', $columns)) {
        echo "\n   ERROR: 'file_path' column is MISSING from email_attachments table!\n";
        echo "   This is why attachments are not being saved to database.\n";
        echo "\n   Run this SQL to fix:\n";
        echo "   ALTER TABLE email_attachments ADD COLUMN file_path VARCHAR(500) AFTER size;\n\n";
    } else {
        echo "   file_path column exists (good!)\n";
    }
    
    // Count emails
    $stmt = $db->query("SELECT COUNT(*) as count FROM email_automation");
    $result = $stmt->fetch();
    echo "\n   Total emails: " . $result['count'] . "\n";
    
    // Count attachments
    $stmt = $db->query("SELECT COUNT(*) as count FROM email_attachments");
    $result = $stmt->fetch();
    echo "   Total attachments: " . $result['count'] . "\n";
    
    // Check for orphan emails (attachment_count > 0 but no attachments)
    $stmt = $db->query("SELECT ea.id, ea.email_uid, ea.subject, ea.attachment_count 
                        FROM email_automation ea 
                        LEFT JOIN email_attachments att ON ea.id = att.email_id 
                        WHERE ea.attachment_count > 0 AND att.id IS NULL");
    $orphans = $stmt->fetchAll();
    if (count($orphans) > 0) {
        echo "   WARNING: " . count($orphans) . " emails have attachment_count > 0 but no attachments in table\n";
        foreach ($orphans as $email) {
            echo "     - ID {$email['id']} (UID: {$email['email_uid']}): '" . substr($email['subject'], 0, 30) . "' (count: {$email['attachment_count']})\n";
        }
    } else {
        echo "   No orphan emails found (good!)\n";
    }
    
    // Show recent emails with attachments
    $stmt = $db->query("SELECT ea.id, ea.email_uid, ea.subject, ea.attachment_count, COUNT(att.id) as actual_count
                        FROM email_automation ea
                        LEFT JOIN email_attachments att ON ea.id = att.email_id
                        GROUP BY ea.id
                        HAVING actual_count > 0
                        ORDER BY ea.date_received DESC
                        LIMIT 5");
    $recent = $stmt->fetchAll();
    if (count($recent) > 0) {
        echo "\n   Recent emails with attachments:\n";
        foreach ($recent as $email) {
            echo "     - ID {$email['id']}: '" . substr($email['subject'], 0, 30) . "' (stored: {$email['actual_count']}, counted: {$email['attachment_count']})\n";
        }
    }
    
} catch (Exception $e) {
    echo "   Database error: " . $e->getMessage() . "\n";
}
echo "\n";

// 3. Test file write
echo "3. File Write Test:\n";
$testFile = $uploadDir . 'test_' . time() . '.txt';
$testContent = 'Test content ' . date('Y-m-d H:i:s');
$result = file_put_contents($testFile, $testContent);
if ($result !== false) {
    echo "   Write test: SUCCESS ($result bytes written)\n";
    echo "   File: $testFile\n";
    // Clean up
    unlink($testFile);
    echo "   Cleanup: SUCCESS\n";
} else {
    echo "   Write test: FAILED\n";
}
echo "\n";

// 4. Check PHP IMAP extension
echo "4. PHP Configuration:\n";
echo "   IMAP extension: " . (extension_loaded('imap') ? 'LOADED' : 'NOT LOADED') . "\n";
echo "   Memory limit: " . ini_get('memory_limit') . "\n";
echo "   Max execution time: " . ini_get('max_execution_time') . " seconds\n";
echo "   Upload max filesize: " . ini_get('upload_max_filesize') . "\n";
echo "   Post max size: " . ini_get('post_max_size') . "\n";

echo "\n=== Test Complete ===\n";
