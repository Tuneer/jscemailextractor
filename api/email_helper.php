<?php
// Email helper

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

require_once __DIR__ . '/db.php';

function fetchEmails($limit = 10, $options = []) {
    global $email_config;
    $mailbox = $email_config['imap_host'];
    $username = $email_config['imap_user'];
    $password = $email_config['imap_password'];
    
    error_log("fetchEmails: Connecting to IMAP - Host: $mailbox, User: $username");
    
    $inbox = @imap_open($mailbox, $username, $password);
    if (!$inbox) {
        $error = imap_last_error();
        error_log("IMAP connection failed in fetchEmails: " . ($error ?: 'Unknown error'));
        return [];
    }
    
    error_log("fetchEmails: IMAP connection successful");
    
    // Build search criteria based on options
    $searchCriteria = '';
    
    // Start with sender filter if provided
    if (!empty($options['senderEmail'])) {
        $searchCriteria = 'FROM "' . $options['senderEmail'] . '"';
    } else {
        $searchCriteria = 'ALL';
    }
    
    error_log("fetchEmails: Search criteria: $searchCriteria");
    $emails = imap_search($inbox, $searchCriteria, SE_UID);
    
    if (!$emails) {
        $error = imap_last_error();
        error_log("fetchEmails: No emails found with criteria: $searchCriteria - Error: " . ($error ?: 'None'));
        imap_close($inbox);
        return [];
    }
    
    error_log("fetchEmails: Found " . count($emails) . " total emails");
    
    rsort($emails); // Sort newest first
    $results = [];
    $count = 0;
    $filterByAttachment = !empty($options['query']) && strpos($options['query'], 'has:attachment') !== false;
    $skippedNoAttachment = 0;
    
    foreach ($emails as $emailUid) {
        if ($count >= $limit) break;
        
        $structure = imap_fetchstructure($inbox, $emailUid, FT_UID);
        
        // Filter by attachment if requested
        if ($filterByAttachment && !hasAttachmentsInStructure($structure)) {
            $skippedNoAttachment++;
            continue;
        }
        
        $overview = imap_fetch_overview($inbox, $emailUid, FT_UID);
        if (!$overview || !isset($overview[0])) {
            error_log("fetchEmails: Failed to get overview for UID $emailUid");
            continue;
        }
        
        // Get attachment info
        $attachments = [];
        if (isset($structure->parts)) {
            $attachments = getAttachmentsInfo($inbox, $emailUid, $structure->parts);
        }
        
        $results[] = [
            'id' => (int)$emailUid,  // Use UID as ID for IMAP emails
            'uid' => (int)$emailUid,
            'subject' => decodeMimeString($overview[0]->subject ?? ''),
            'from' => decodeMimeString($overview[0]->from ?? ''),
            'from_email' => extractEmailAddress($overview[0]->from ?? ''),
            'to' => $overview[0]->to ?? '',
            'date' => $overview[0]->date ?? '',
            'hasAttachments' => !empty($attachments),
            'attachmentCount' => count($attachments),
            'attachments' => $attachments
        ];
        $count++;
    }
    
    imap_close($inbox);
    error_log("fetchEmails: Returning " . count($results) . " emails (skipped $skippedNoAttachment without attachments)");
    return $results;
}

// Helper function to check if email has attachments
function hasAttachmentsInStructure($structure, $depth = 0) {
    if (isset($structure->parts)) {
        foreach ($structure->parts as $index => $part) {
            $disposition = strtolower($part->disposition ?? '');
            $subtype = strtolower($part->subtype ?? '');
            $hasDparameters = !empty($part->dparameters);
            
            // Check for attachment indicators
            $isAttachment = ($disposition === 'attachment') || 
                           ($disposition === 'inline' && $hasDparameters) ||
                           $hasDparameters ||
                           in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv']);
            
            if ($isAttachment) {
                error_log("hasAttachmentsInStructure: Found attachment at depth $depth, part $index: disposition='$disposition', subtype='$subtype', hasDparameters=" . ($hasDparameters ? 'YES' : 'NO'));
                return true;
            }
            if (isset($part->parts) && hasAttachmentsInStructure($part, $depth + 1)) {
                return true;
            }
        }
    }
    return false;
}

// Helper function to get attachment info
function getAttachmentsInfo($inbox, $emailUid, $parts, $partNumPrefix = '') {
    $attachments = [];
    foreach ($parts as $index => $part) {
        $partNum = $partNumPrefix ? $partNumPrefix . '.' . ($index + 1) : ($index + 1);
        $disposition = strtolower($part->disposition ?? '');
        $subtype = strtolower($part->subtype ?? '');
        
        $isAttachment = ($disposition === 'attachment' || $disposition === 'inline' ||
            !empty($part->dparameters) ||
            in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv']));
        
        if ($isAttachment) {
            $filename = 'attachment';
            if (isset($part->dparameters)) {
                foreach ($part->dparameters as $param) {
                    if (strtolower($param->attribute) === 'filename') {
                        $filename = $param->value;
                        break;
                    }
                }
            }
            if (isset($part->parameters)) {
                foreach ($part->parameters as $param) {
                    if (strtolower($param->attribute) === 'name') {
                        $filename = $param->value;
                        break;
                    }
                }
            }
            $attachments[] = [
                'filename' => decodeMimeString($filename),
                'contentType' => getMimeType($part),
                'content_type' => getMimeType($part),  // Keep both for compatibility
                'size' => $part->bytes ?? 0,
                'part_num' => $partNum
            ];
        }
        
        if (isset($part->parts)) {
            $nestedAttachments = getAttachmentsInfo($inbox, $emailUid, $part->parts, $partNum);
            $attachments = array_merge($attachments, $nestedAttachments);
        }
    }
    return $attachments;
}

// Helper to extract email address
function decodeMimeString($string) {
    if (empty($string)) return '';
    $decoded = imap_mime_header_decode($string);
    if (!$decoded) return $string;
    $result = '';
    foreach ($decoded as $part) {
        $result .= $part->text;
    }
    return $result;
}

function extractEmailAddress($from) {
    if (preg_match('/<([^>]+)>/', $from, $matches)) {
        return $matches[1];
    }
    return $from;
}

// Helper to get MIME type
function getMimeType($part) {
    $types = [0 => 'text', 1 => 'multipart', 2 => 'message', 3 => 'application', 4 => 'audio', 5 => 'image', 6 => 'video', 7 => 'other'];
    $type = $types[$part->type ?? 0] ?? 'application';
    $subtype = strtolower($part->subtype ?? 'octet-stream');
    return $type . '/' . $subtype;
}

function processEmailAttachments($emailUid) {
    global $email_config;
    if (empty($emailUid)) jsonResponse(['success' => false, 'message' => 'Email ID required'], 400);
    
    $mailbox = $email_config['imap_host'];
    $username = $email_config['imap_user'];
    $password = $email_config['imap_password'];
    $inbox = @imap_open($mailbox, $username, $password);
    if (!$inbox) {
        error_log("IMAP connection failed in processEmailAttachments");
        jsonResponse(['success' => false, 'message' => 'IMAP connection failed'], 500);
    }
    
    $overview = imap_fetch_overview($inbox, $emailUid, FT_UID);
    $body = imap_body($inbox, $emailUid, FT_UID | FT_PEEK);
    $userId = getCurrentUserId();
    
    // Check if email already exists
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM email_automation WHERE email_uid = ?");
    $stmt->execute([$emailUid]);
    $existingEmail = $stmt->fetch();
    
    if ($existingEmail) {
        imap_close($inbox);
        jsonResponse(['success' => true, 'message' => 'Email already processed', 'email_id' => $existingEmail['id'], 'existing' => true]);
    }
    
    $emailId = saveEmailMetadata($emailUid, $overview[0]->subject ?? '', $overview[0]->from ?? '', $overview[0]->to ?? '', date('Y-m-d H:i:s'), $body, $userId, null);
    error_log("Email saved with ID: $emailId");
    
    $structure = imap_fetchstructure($inbox, $emailUid, FT_UID);
    $attachments = [];
    
    if (isset($structure->parts)) {
        $attachments = processAttachmentsHelper($inbox, $emailUid, $structure->parts, $emailId);
    }
    
    // Update attachment count
    $stmt = $db->prepare("UPDATE email_automation SET attachment_count = ? WHERE id = ?");
    $stmt->execute([count($attachments), $emailId]);
    
    imap_close($inbox);
    error_log("Processed " . count($attachments) . " attachments for email $emailId");
    jsonResponse(['success' => true, 'email_id' => $emailId, 'attachments' => $attachments, 'attachments_count' => count($attachments)]);
}

// Helper function to process attachments recursively
function processAttachmentsHelper($inbox, $emailUid, $parts, $emailId, $partNumPrefix = '') {
    $attachments = [];
    $uploadDir = __DIR__ . '/attachments/';
    
    // Create directory with proper error handling
    if (!is_dir($uploadDir)) {
        error_log("Creating attachments directory: $uploadDir");
        if (!mkdir($uploadDir, 0777, true)) {
            error_log("Failed to create attachments directory: $uploadDir");
            return $attachments;
        }
    }
    
    // Ensure directory is writable
    if (!is_writable($uploadDir)) {
        error_log("Attachments directory not writable, attempting chmod: $uploadDir");
        chmod($uploadDir, 0777);
    }
    
    foreach ($parts as $index => $part) {
        $partNum = $partNumPrefix ? $partNumPrefix . '.' . ($index + 1) : ($index + 1);
        $disposition = strtolower($part->disposition ?? '');
        $subtype = strtolower($part->subtype ?? '');
        $hasDparameters = !empty($part->dparameters);
        
        // Check if this is an attachment
        $isAttachment = ($disposition === 'attachment' || $disposition === 'inline') || 
                       $hasDparameters || 
                       in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv']);
        
        error_log("processAttachmentsHelper: part $partNum, disposition='$disposition', subtype='$subtype', hasDparameters=" . ($hasDparameters ? 'YES' : 'NO') . ", isAttachment=" . ($isAttachment ? 'YES' : 'NO'));
        
        if ($isAttachment) {
            // Get filename with better fallback
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
            
            // Fallback filename based on subtype
            if (!$filename) {
                $extensions = [
                    'vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
                    'vnd.ms-excel' => 'xls',
                    'pdf' => 'pdf',
                    'csv' => 'csv',
                    'octet-stream' => 'bin',
                    'plain' => 'txt'
                ];
                $ext = $extensions[$subtype] ?? 'bin';
                $filename = 'attachment_' . uniqid() . '.' . $ext;
                error_log("Using fallback filename: $filename");
            }
            
            // Decode filename if needed
            $decodedFilename = imap_mime_header_decode($filename);
            if ($decodedFilename) {
                $filename = '';
                foreach ($decodedFilename as $part_name) {
                    $filename .= $part_name->text;
                }
            }
            
            error_log("Processing attachment: $filename (part $partNum)");
            
            // Get and decode content
            $data = imap_fetchbody($inbox, $emailUid, $partNum, FT_UID);
            if ($data === false) {
                error_log("Failed to fetch body for part $partNum");
                continue;
            }
            
            // Decode based on encoding
            $encoding = $part->encoding ?? 0;
            error_log("Decoding content with encoding: $encoding, size before: " . strlen($data));
            switch ($encoding) {
                case 3: // BASE64
                    $data = base64_decode($data);
                    break;
                case 4: // QUOTED-PRINTABLE
                    $data = quoted_printable_decode($data);
                    break;
            }
            error_log("Decoded content size: " . strlen($data) . " bytes");
            
            // Save file with error checking
            $safeFilename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
            $uniqueFilename = time() . '_' . uniqid() . '_' . $safeFilename;
            $filePath = $uploadDir . $uniqueFilename;
            
            error_log("Saving attachment to: $filePath");
            $saveResult = file_put_contents($filePath, $data);
            if ($saveResult === false) {
                error_log("Failed to save attachment file: $filePath");
                continue;
            }
            error_log("Successfully saved attachment: $filePath ($saveResult bytes)");
            
            // Save to database
            try {
                $db = getDB();
                $isExcel = in_array(strtolower(pathinfo($filename, PATHINFO_EXTENSION)), ['xlsx', 'xls', 'csv']);
                $stmt = $db->prepare("INSERT INTO email_attachments (email_id, filename, content_type, size, file_path, is_coupon_file) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $emailId,
                    $filename,
                    getMimeType($part),
                    strlen($data),
                    $filePath,
                    $isExcel ? 1 : 0
                ]);
                $attachmentId = $db->lastInsertId();
                error_log("Saved attachment to database with ID: $attachmentId");
            } catch (Exception $e) {
                error_log("Failed to save attachment to database: " . $e->getMessage());
                continue;
            }
            
            $attachments[] = [
                'filename' => $filename,
                'path' => $filePath,
                'size' => strlen($data)
            ];
            error_log("Saved attachment: $filename (" . strlen($data) . " bytes)");
        }
        
        // Handle nested parts
        if (isset($part->parts)) {
            $nestedAttachments = processAttachmentsHelper($inbox, $emailUid, $part->parts, $emailId, $partNum);
            $attachments = array_merge($attachments, $nestedAttachments);
        }
    }
    
    return $attachments;
}

function uploadExcelFile() {
    if (!isset($_FILES['file'])) jsonResponse(['success' => false, 'message' => 'No file'], 400);
    $file = $_FILES['file'];
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $filename = time() . '_' . basename($file['name']);
    $targetPath = $uploadDir . $filename;
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        jsonResponse(['success' => true, 'filename' => $filename, 'message' => 'File uploaded']);
    } else {
        jsonResponse(['success' => false, 'message' => 'Upload failed'], 500);
    }
}

function testImapConnection() {
    global $email_config;
    $mailbox = $email_config['imap_host'];
    $username = $email_config['imap_user'];
    $password = $email_config['imap_password'];
    $inbox = @imap_open($mailbox, $username, $password);
    if ($inbox) {
        imap_close($inbox);
        return true;
    }
    return false;
}
