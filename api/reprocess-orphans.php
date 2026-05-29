<?php
/**
 * Reprocess orphan emails - emails with attachment_count > 0 but no attachments in table
 * Run this once after adding the file_path column
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

require_once __DIR__ . '/email_automation.php';

echo "<pre>";
echo "=== Reprocess Orphan Emails ===\n\n";

// Get orphan emails from database
$db = getDB();
$stmt = $db->query("SELECT ea.id, ea.email_uid, ea.subject, ea.attachment_count 
                    FROM email_automation ea 
                    LEFT JOIN email_attachments att ON ea.id = att.email_id 
                    WHERE ea.attachment_count > 0 AND att.id IS NULL");
$orphans = $stmt->fetchAll();

if (empty($orphans)) {
    echo "No orphan emails found. Nothing to do.\n";
    echo "</pre>";
    exit;
}

echo "Found " . count($orphans) . " orphan emails to reprocess:\n";
foreach ($orphans as $email) {
    echo "  - ID {$email['id']}: '{$email['subject']}' (UID: {$email['email_uid']})\n";
}
echo "\n";

// Connect to IMAP
global $email_config;
$mailbox = $email_config['imap_host'];
$username = $email_config['imap_user'];
$password = $email_config['imap_password'];

echo "Connecting to IMAP...\n";
$inbox = @imap_open($mailbox, $username, $password);
if (!$inbox) {
    $error = imap_last_error();
    echo "IMAP connection failed: " . ($error ?: 'Unknown error') . "\n";
    echo "</pre>";
    exit;
}
echo "IMAP connected successfully.\n\n";

// Process each orphan email
$service = new EmailAutomationService();
$service->connect();

foreach ($orphans as $email) {
    $emailId = $email['id'];
    $emailUid = $email['email_uid'];
    $subject = $email['subject'];
    
    echo "Processing email ID $emailId (UID: $emailUid): '$subject'\n";
    
    // Get email structure
    $structure = imap_fetchstructure($inbox, $emailUid, FT_UID);
    
    if (!isset($structure->parts)) {
        echo "  No parts found in this email.\n";
        continue;
    }
    
    echo "  Found " . count($structure->parts) . " parts\n";
    
    // Process attachments manually
    $attachments = [];
    $uploadDir = __DIR__ . '/attachments/';
    
    foreach ($structure->parts as $index => $part) {
        $partNum = $index + 1;
        $disposition = strtolower($part->disposition ?? '');
        $subtype = strtolower($part->subtype ?? '');
        $hasDparameters = !empty($part->dparameters);
        
        echo "  Part $partNum: disposition='$disposition', subtype='$subtype', hasDparameters=" . ($hasDparameters ? 'YES' : 'NO') . "\n";
        
        $isAttachment = ($disposition === 'attachment' || $disposition === 'inline') || 
                       $hasDparameters || 
                       in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv']);
        
        if ($isAttachment) {
            // Get filename
            $filename = null;
            if (isset($part->dparameters)) {
                foreach ($part->dparameters as $param) {
                    if (strtolower($param->attribute ?? '') === 'filename') {
                        $filename = $param->value;
                        break;
                    }
                }
            }
            if (!$filename && isset($part->parameters)) {
                foreach ($part->parameters as $param) {
                    if (strtolower($param->attribute ?? '') === 'name') {
                        $filename = $param->value;
                        break;
                    }
                }
            }
            
            if (!$filename) {
                $extensions = [
                    'vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
                    'vnd.ms-excel' => 'xls',
                    'pdf' => 'pdf',
                    'csv' => 'csv',
                    'octet-stream' => 'bin'
                ];
                $ext = $extensions[$subtype] ?? 'bin';
                $filename = 'attachment_' . uniqid() . '.' . $ext;
            }
            
            // Decode filename
            $decoded = imap_mime_header_decode($filename);
            if ($decoded) {
                $filename = '';
                foreach ($decoded as $p) {
                    $filename .= $p->text;
                }
            }
            
            echo "    Filename: $filename\n";
            
            // Get content
            $data = imap_fetchbody($inbox, $emailUid, $partNum, FT_UID);
            if ($data === false) {
                echo "    ERROR: Failed to fetch body for part $partNum\n";
                continue;
            }
            
            // Decode content
            switch ($part->encoding ?? 0) {
                case 3: // BASE64
                    $data = base64_decode($data);
                    break;
                case 4: // QUOTED-PRINTABLE
                    $data = quoted_printable_decode($data);
                    break;
            }
            
            echo "    Content size: " . strlen($data) . " bytes\n";
            
            // Save file
            $safeFilename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
            $uniqueFilename = time() . '_' . uniqid() . '_' . $safeFilename;
            $filePath = $uploadDir . $uniqueFilename;
            
            $saveResult = file_put_contents($filePath, $data);
            if ($saveResult === false) {
                echo "    ERROR: Failed to save file to $filePath\n";
                continue;
            }
            echo "    Saved to: $filePath\n";
            
            // Get MIME type
            $mimeType = 'application/octet-stream';
            if (isset($part->subtype)) {
                $mimeType = ($part->type ?? 0) . '/' . $part->subtype;
                $types = [0 => 'text', 1 => 'multipart', 2 => 'message', 3 => 'application', 4 => 'audio', 5 => 'image', 6 => 'video', 7 => 'other'];
                $mimeType = ($types[$part->type ?? 0] ?? 'application') . '/' . $part->subtype;
            }
            
            // Insert into database
            try {
                $isExcel = in_array(strtolower(pathinfo($filename, PATHINFO_EXTENSION)), ['xlsx', 'xls', 'csv']);
                $stmt = $db->prepare("INSERT INTO email_attachments (email_id, filename, content_type, size, file_path, is_coupon_file) VALUES (?, ?, ?, ?, ?, ?)");
                $result = $stmt->execute([
                    $emailId,
                    $filename,
                    $mimeType,
                    strlen($data),
                    $filePath,
                    $isExcel ? 1 : 0
                ]);
                
                if ($result) {
                    $attachmentId = $db->lastInsertId();
                    echo "    Database insert SUCCESS - Attachment ID: $attachmentId\n";
                    $attachments[] = $filename;
                } else {
                    echo "    Database insert FAILED: " . implode(', ', $stmt->errorInfo()) . "\n";
                }
            } catch (Exception $e) {
                echo "    Database exception: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "  Total attachments saved: " . count($attachments) . "\n\n";
}

imap_close($inbox);

// Verify fix
echo "=== Verification ===\n";
$stmt = $db->query("SELECT COUNT(*) as count FROM email_attachments");
$result = $stmt->fetch();
echo "Total attachments in database: " . $result['count'] . "\n";

$stmt = $db->query("SELECT ea.id, ea.subject, ea.attachment_count, COUNT(att.id) as actual_count 
                    FROM email_automation ea 
                    LEFT JOIN email_attachments att ON ea.id = att.email_id 
                    GROUP BY ea.id");
$emails = $stmt->fetchAll();
echo "\nEmail attachment status:\n";
foreach ($emails as $email) {
    $status = ($email['actual_count'] == $email['attachment_count']) ? 'OK' : 'MISMATCH';
    echo "  ID {$email['id']}: '{$email['subject']}' - counted: {$email['attachment_count']}, actual: {$email['actual_count']} [$status]\n";
}

echo "\n=== Done ===\n";
echo "</pre>";
