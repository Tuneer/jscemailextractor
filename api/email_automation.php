<?php
// Email Automation Service - Automatic email capture and processing

// Load Composer autoloader for PhpSpreadsheet
require_once __DIR__ . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

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

class EmailAutomationService {
    private $imapHost;
    private $imapUser;
    private $imapPassword;
    private $inbox;
    
    public function __construct() {
        global $email_config;
        $this->imapHost = $email_config['imap_host'];
        $this->imapUser = $email_config['imap_user'];
        $this->imapPassword = $email_config['imap_password'];
    }
    
    // Connect to IMAP server
    public function connect() {
        $this->inbox = @imap_open($this->imapHost, $this->imapUser, $this->imapPassword);
        if (!$this->inbox) {
            $error = imap_last_error();
            error_log("IMAP Connection Error: " . ($error ?: 'Unknown error'));
            return false;
        }
        return true;
    }
    
    // Disconnect from IMAP server
    public function disconnect() {
        if ($this->inbox) {
            imap_close($this->inbox);
            $this->inbox = null;
        }
    }
    
    // Fetch all unread emails
    public function fetchUnreadEmails($limit = 50) {
        if (!$this->inbox && !$this->connect()) {
            return ['success' => false, 'message' => 'IMAP connection failed', 'emails' => []];
        }
        
        $emails = imap_search($this->inbox, 'UNSEEN', SE_UID);
        if (!$emails) {
            return ['success' => true, 'message' => 'No unread emails', 'emails' => [], 'count' => 0];
        }
        
        rsort($emails);
        $results = [];
        $count = 0;
        
        foreach ($emails as $emailUid) {
            if ($count >= $limit) break;
            
            $emailData = $this->processEmail($emailUid);
            if ($emailData) {
                $results[] = $emailData;
                $count++;
            }
        }
        
        return ['success' => true, 'emails' => $results, 'count' => count($results)];
    }
    
    // Fetch emails from specific sender
    public function fetchEmailsFromSender($senderEmail, $limit = 50) {
        if (!$this->inbox && !$this->connect()) {
            return ['success' => false, 'message' => 'IMAP connection failed', 'emails' => []];
        }
        
        $searchCriteria = 'UNSEEN FROM "' . $senderEmail . '"';
        $emails = imap_search($this->inbox, $searchCriteria, SE_UID);
        
        if (!$emails) {
            return ['success' => true, 'message' => 'No emails from sender', 'emails' => [], 'count' => 0];
        }
        
        rsort($emails);
        $results = [];
        $count = 0;
        
        foreach ($emails as $emailUid) {
            if ($count >= $limit) break;
            
            $emailData = $this->processEmail($emailUid);
            if ($emailData) {
                $results[] = $emailData;
                $count++;
            }
        }
        
        return ['success' => true, 'emails' => $results, 'count' => count($results)];
    }
    
    // Fetch emails with attachments only
    public function fetchEmailsWithAttachments($limit = 50) {
        if (!$this->inbox && !$this->connect()) {
            error_log("IMAP connection failed in fetchEmailsWithAttachments");
            return ['success' => false, 'message' => 'IMAP connection failed', 'emails' => []];
        }
        
        $emails = imap_search($this->inbox, 'UNSEEN', SE_UID);
        if (!$emails) {
            return ['success' => true, 'message' => 'No unread emails', 'emails' => [], 'count' => 0];
        }
        
        error_log("Found " . count($emails) . " unread emails, checking for attachments...");
        
        rsort($emails);
        $results = [];
        $count = 0;
        $skippedCount = 0;
        
        foreach ($emails as $emailUid) {
            if ($count >= $limit) break;
            
            $structure = imap_fetchstructure($this->inbox, $emailUid, FT_UID);
            $hasAttachments = $this->hasAttachments($structure);
            error_log("Email UID $emailUid: hasAttachments = " . ($hasAttachments ? 'YES' : 'NO') . ", parts count = " . (isset($structure->parts) ? count($structure->parts) : 0));
            
            if ($hasAttachments) {
                $emailData = $this->processEmail($emailUid);
                if ($emailData) {
                    $results[] = $emailData;
                    $count++;
                    error_log("Processed email UID $emailUid with " . count($emailData['attachments']) . " attachments");
                }
            } else {
                $skippedCount++;
            }
        }
        
        error_log("Finished processing: $count emails with attachments, $skippedCount skipped (no attachments)");
        
        return ['success' => true, 'emails' => $results, 'count' => count($results)];
    }
    
    // Check if email has attachments
    private function hasAttachments($structure) {
        if (isset($structure->parts)) {
            foreach ($structure->parts as $index => $part) {
                $disposition = strtolower($part->disposition ?? '');
                $subtype = strtolower($part->subtype ?? '');
                $hasDparameters = !empty($part->dparameters);
                
                error_log("Checking part $index: disposition='$disposition', subtype='$subtype', hasDparameters=" . ($hasDparameters ? 'YES' : 'NO'));
                
                // Check for various attachment indicators
                if ($disposition === 'attachment' || $disposition === 'inline' || 
                    $hasDparameters ||
                    in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv'])) {
                    error_log("Found attachment in part $index with disposition: $disposition, subtype: $subtype");
                    return true;
                }
                if (isset($part->parts)) {
                    if ($this->hasAttachments($part)) {
                        return true;
                    }
                }
            }
        } else {
            error_log("No parts in structure, checking if single part is attachment...");
            // Single part email - check if it's an attachment
            $disposition = strtolower($structure->disposition ?? '');
            $subtype = strtolower($structure->subtype ?? '');
            if ($disposition === 'attachment' || in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv'])) {
                error_log("Single part is an attachment: disposition=$disposition, subtype=$subtype");
                return true;
            }
        }
        return false;
    }
    
    // Process single email
    private function processEmail($emailUid) {
        $overview = imap_fetch_overview($this->inbox, $emailUid, FT_UID);
        if (!$overview || !isset($overview[0])) {
            return null;
        }
        
        $overview = $overview[0];
        $structure = imap_fetchstructure($this->inbox, $emailUid, FT_UID);
        
        // Get email body
        $body = $this->getEmailBody($emailUid, $structure);
        
        // Extract email data
        $emailData = [
            'uid' => $emailUid,
            'subject' => $this->decodeMimeString($overview->subject ?? ''),
            'from' => $this->decodeMimeString($overview->from ?? ''),
            'from_email' => $this->extractEmailAddress($overview->from ?? ''),
            'to' => $overview->to ?? '',
            'date' => date('Y-m-d H:i:s', strtotime($overview->date ?? 'now')),
            'body_text' => $body['text'] ?? '',
            'body_html' => $body['html'] ?? '',
            'attachments' => []
        ];
        
        // Process attachments
        if (isset($structure->parts)) {
            error_log("Processing " . count($structure->parts) . " parts for attachments in email UID $emailUid");
            $emailData['attachments'] = $this->processAttachments($emailUid, $structure->parts);
            error_log("Found " . count($emailData['attachments']) . " attachments in email UID $emailUid");
        } else {
            error_log("No parts found in email UID $emailUid - checking if single part is attachment");
            // Check if the single part is an attachment
            $disposition = strtolower($structure->disposition ?? '');
            $subtype = strtolower($structure->subtype ?? '');
            if ($disposition === 'attachment' || in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv'])) {
                error_log("Single part email is an attachment: disposition=$disposition, subtype=$subtype");
                $content = imap_body($this->inbox, $emailUid, FT_UID);
                $decoded = $this->decodeContent($content, $structure->encoding ?? 0);
                $filename = 'attachment_' . $emailUid;
                if (isset($structure->dparameters)) {
                    foreach ($structure->dparameters as $param) {
                        if (strtolower($param->attribute) === 'filename') {
                            $filename = $this->decodeMimeString($param->value);
                            break;
                        }
                    }
                }
                $emailData['attachments'][] = [
                    'filename' => $filename,
                    'content_type' => $this->getMimeType($structure),
                    'size' => strlen($decoded),
                    'data' => $decoded,
                    'file_path' => $this->saveAttachmentToFile($filename, $decoded)
                ];
            }
        }
        
        // Save to database
        $savedEmail = $this->saveEmailToDatabase($emailData);
        $emailData['saved'] = $savedEmail;
        
        return $emailData;
    }
    
    // Get email body (text and HTML)
    private function getEmailBody($emailUid, $structure) {
        $body = ['text' => '', 'html' => ''];
        
        if (!isset($structure->parts)) {
            // Simple email, no multipart
            $content = imap_body($this->inbox, $emailUid, FT_UID | FT_PEEK);
            $body['text'] = $this->decodeContent($content, $structure->encoding ?? 0);
        } else {
            // Multipart email
            foreach ($structure->parts as $partNum => $part) {
                $disposition = strtolower($part->disposition ?? '');
                $subtype = strtolower($part->subtype ?? '');
                $hasDparameters = !empty($part->dparameters);
                
                // Skip attachments (various indicators)
                if ($disposition === 'attachment' || $disposition === 'inline' || $hasDparameters ||
                    in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv'])) {
                    continue;
                }
                
                $content = imap_fetchbody($this->inbox, $emailUid, $partNum + 1, FT_UID | FT_PEEK);
                $decoded = $this->decodeContent($content, $part->encoding ?? 0);
                
                $mimeType = $this->getMimeType($part);
                if ($mimeType === 'text/html') {
                    $body['html'] = $decoded;
                } elseif ($mimeType === 'text/plain' && empty($body['text'])) {
                    $body['text'] = $decoded;
                }
                
                // Handle nested parts
                if (isset($part->parts)) {
                    $nestedBody = $this->getEmailBodyFromParts($emailUid, $part->parts, $partNum + 1);
                    $body['text'] = $nestedBody['text'] ?: $body['text'];
                    $body['html'] = $nestedBody['html'] ?: $body['html'];
                }
            }
        }
        
        return $body;
    }
    
    // Get body from nested parts
    private function getEmailBodyFromParts($emailUid, $parts, $parentPartNum) {
        $body = ['text' => '', 'html' => ''];
        
        foreach ($parts as $subPartNum => $part) {
            $disposition = strtolower($part->disposition ?? '');
            $subtype = strtolower($part->subtype ?? '');
            $hasDparameters = !empty($part->dparameters);
            
            // Skip attachments (various indicators)
            if ($disposition === 'attachment' || $disposition === 'inline' || $hasDparameters ||
                in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv'])) {
                continue;
            }
            
            $partNumber = $parentPartNum . '.' . ($subPartNum + 1);
            $content = imap_fetchbody($this->inbox, $emailUid, $partNumber, FT_UID | FT_PEEK);
            $decoded = $this->decodeContent($content, $part->encoding ?? 0);
            
            $mimeType = $this->getMimeType($part);
            if ($mimeType === 'text/html') {
                $body['html'] = $decoded;
            } elseif ($mimeType === 'text/plain') {
                $body['text'] = $decoded;
            }
        }
        
        return $body;
    }
    
    // Process attachments
    private function processAttachments($emailUid, $parts, $partNumPrefix = '') {
        $attachments = [];
        
        foreach ($parts as $index => $part) {
            $partNum = $partNumPrefix ? $partNumPrefix . '.' . ($index + 1) : ($index + 1);
            $disposition = strtolower($part->disposition ?? '');
            $subtype = strtolower($part->subtype ?? '');
            $hasDparameters = !empty($part->dparameters);
            
            // Check if this is an attachment (handle various disposition types)
            $isAttachment = ($disposition === 'attachment' || $disposition === 'inline') || 
                           $hasDparameters || 
                           in_array($subtype, ['octet-stream', 'pdf', 'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'csv']);
            
            error_log("Part $partNum: disposition='$disposition', subtype='$subtype', hasDparameters=" . ($hasDparameters ? 'YES' : 'NO') . ", isAttachment=" . ($isAttachment ? 'YES' : 'NO'));
            
            if ($isAttachment) {
                try {
                    error_log("Processing attachment part $partNum with disposition: $disposition");
                    $filename = $this->getAttachmentFilename($part);
                    error_log("Filename for part $partNum: " . ($filename ?: 'NOT FOUND'));
                    
                    if ($filename) {
                        $content = imap_fetchbody($this->inbox, $emailUid, $partNum, FT_UID);
                        $decoded = $this->decodeContent($content, $part->encoding ?? 0);
                        
                        error_log("Decoded content for $filename: " . strlen($decoded) . " bytes");
                        
                        $attachmentData = [
                            'filename' => $filename,
                            'content_type' => $this->getMimeType($part),
                            'size' => strlen($decoded),
                            'data' => $decoded
                        ];
                        
                        // Save attachment to file
                        $savedPath = $this->saveAttachmentToFile($filename, $decoded);
                        $attachmentData['file_path'] = $savedPath;
                        
                        // Parse Excel if applicable
                        if ($this->isExcelFile($filename)) {
                            $attachmentData['excel_data'] = $this->parseExcelContent($decoded, $filename);
                        }
                        
                        $attachments[] = $attachmentData;
                        error_log("Successfully processed attachment: $filename");
                    }
                } catch (Exception $e) {
                    error_log("Error processing attachment part $partNum: " . $e->getMessage());
                }
            }
            
            // Handle nested parts
            if (isset($part->parts)) {
                $nestedAttachments = $this->processAttachments($emailUid, $part->parts, $partNum);
                $attachments = array_merge($attachments, $nestedAttachments);
            }
        }
        
        return $attachments;
    }
    
    // Get attachment filename
    private function getAttachmentFilename($part) {
        $filename = null;
        
        // Try dparameters first (most common for attachments)
        if (isset($part->dparameters)) {
            foreach ($part->dparameters as $param) {
                $attr = strtolower($param->attribute ?? '');
                error_log("getAttachmentFilename: checking dparameter attr='$attr', value='" . ($param->value ?? '') . "'");
                if ($attr === 'filename') {
                    $filename = $param->value;
                    break;
                }
            }
        }
        
        // Try parameters if no filename found
        if (!$filename && isset($part->parameters)) {
            foreach ($part->parameters as $param) {
                $attr = strtolower($param->attribute ?? '');
                error_log("getAttachmentFilename: checking parameter attr='$attr', value='" . ($param->value ?? '') . "'");
                if ($attr === 'name' || $attr === 'filename') {
                    $filename = $param->value;
                    break;
                }
            }
        }
        
        // Fallback: generate filename based on subtype
        if (!$filename) {
            $subtype = strtolower($part->subtype ?? 'octet-stream');
            $extensions = [
                'vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
                'vnd.ms-excel' => 'xls',
                'pdf' => 'pdf',
                'csv' => 'csv',
                'octet-stream' => 'bin',
                'plain' => 'txt',
                'html' => 'html'
            ];
            $ext = $extensions[$subtype] ?? 'bin';
            $filename = 'attachment_' . time() . '.' . $ext;
            error_log("getAttachmentFilename: using fallback filename='$filename'");
        }
        
        // Decode MIME encoded filename
        $decoded = $this->decodeMimeString($filename);
        error_log("getAttachmentFilename: final filename='$decoded'");
        return $decoded;
    }
    
    // Get MIME type
    private function getMimeType($part) {
        $types = [
            0 => 'text', 1 => 'multipart', 2 => 'message', 3 => 'application',
            4 => 'audio', 5 => 'image', 6 => 'video', 7 => 'other'
        ];
        $subtypes = [
            0 => 'unknown', 1 => 'plain', 2 => 'html', 3 => 'enriched',
            4 => 'richtext', 5 => 'rtf', 6 => 'xml', 7 => 'csv',
            8 => 'json', 9 => 'pdf', 10 => 'zip', 11 => 'x-gzip',
            12 => 'x-tar', 13 => 'vnd.ms-excel', 14 => 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        $type = $types[$part->type ?? 0] ?? 'application';
        $subtype = strtolower($part->subtype ?? 'octet-stream');
        
        return $type . '/' . $subtype;
    }
    
    // Decode content based on encoding
    private function decodeContent($content, $encoding) {
        switch ($encoding) {
            case 0: // 7BIT
            case 1: // 8BIT
            case 2: // BINARY
                return $content;
            case 3: // BASE64
                return base64_decode($content);
            case 4: // QUOTED-PRINTABLE
                return quoted_printable_decode($content);
            default:
                return $content;
        }
    }
    
    // Decode MIME encoded string
    private function decodeMimeString($string) {
        if (empty($string)) return '';
        $decoded = imap_mime_header_decode($string);
        $result = '';
        foreach ($decoded as $part) {
            $result .= $part->text;
        }
        return $result;
    }
    
    // Extract email address from string
    private function extractEmailAddress($from) {
        if (preg_match('/<([^>]+)>/', $from, $matches)) {
            return $matches[1];
        }
        return $from;
    }
    
    // Save attachment to file
    private function saveAttachmentToFile($filename, $content) {
        $uploadDir = __DIR__ . '/attachments/';
        
        // Create directory if not exists
        if (!is_dir($uploadDir)) {
            error_log("Attachments directory does not exist, attempting to create: $uploadDir");
            if (!mkdir($uploadDir, 0777, true)) {
                error_log("Failed to create attachments directory: $uploadDir");
                return null;
            }
            error_log("Successfully created attachments directory: $uploadDir");
        }
        
        // Check if directory is writable
        if (!is_writable($uploadDir)) {
            error_log("Attachments directory is not writable: $uploadDir, attempting chmod");
            if (!chmod($uploadDir, 0777)) {
                error_log("Failed to chmod attachments directory: $uploadDir");
            }
        }
        
        // Generate safe filename
        $safeFilename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
        $uniqueFilename = time() . '_' . uniqid() . '_' . $safeFilename;
        $filePath = $uploadDir . $uniqueFilename;
        
        error_log("Attempting to save attachment to: $filePath");
        
        $result = file_put_contents($filePath, $content);
        if ($result === false) {
            error_log("Failed to save attachment file: $filePath - Error: " . error_get_last()['message'] ?? 'Unknown error');
            return null;
        }
        
        error_log("Successfully saved attachment: $filePath ($result bytes written)");
        return $filePath;
    }
    
    // Check if file is Excel
    private function isExcelFile($filename) {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($ext, ['xlsx', 'xls', 'csv']);
    }
    
    // Parse Excel content (supports CSV and XLSX/XLS via PhpSpreadsheet)
    private function parseExcelContent($content, $filename) {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if ($ext === 'csv') {
            return $this->parseCSV($content);
        }
        
        // For xlsx/xls files, use PhpSpreadsheet
        if (in_array($ext, ['xlsx', 'xls'])) {
            return $this->parseExcelFile($content, $ext);
        }
        
        return [];
    }
    
    // Parse XLSX/XLS files using PhpSpreadsheet
    private function parseExcelFile($content, $ext) {
        try {
            // Write content to temp file for parsing
            $tempFile = tempnam(sys_get_temp_dir(), 'excel_') . '.' . $ext;
            file_put_contents($tempFile, $content);
            
            $spreadsheet = IOFactory::load($tempFile);
            $worksheet = $spreadsheet->getActiveSheet();
            
            $data = [];
            $headers = [];
            $rowIndex = 0;
            
            foreach ($worksheet->getRowIterator() as $row) {
                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);
                
                $rowData = [];
                $colIndex = 0;
                
                foreach ($cellIterator as $cell) {
                    $value = $cell->getValue();
                    
                    if ($rowIndex === 0) {
                        // First row as headers
                        $headers[] = $value ?? 'column_' . $colIndex;
                    } else {
                        // Use headers as keys
                        $key = $headers[$colIndex] ?? 'column_' . $colIndex;
                        $rowData[$key] = $value;
                    }
                    $colIndex++;
                }
                
                if ($rowIndex > 0 && !empty($rowData)) {
                    // Only add rows with at least one non-null value
                    $hasValue = false;
                    foreach ($rowData as $val) {
                        if ($val !== null && $val !== '') {
                            $hasValue = true;
                            break;
                        }
                    }
                    if ($hasValue) {
                        $data[] = $rowData;
                    }
                }
                $rowIndex++;
            }
            
            // Clean up temp file
            unlink($tempFile);
            
            error_log("Parsed Excel file: $rowIndex rows, " . count($data) . " data rows");
            return $data;
            
        } catch (Exception $e) {
            error_log("Error parsing Excel file: " . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
    
    // Parse CSV content
    private function parseCSV($content) {
        $lines = explode("\n", $content);
        $data = [];
        $headers = [];
        
        foreach ($lines as $index => $line) {
            if (empty(trim($line))) continue;
            
            $row = str_getcsv($line);
            if ($index === 0) {
                $headers = $row;
            } else {
                if (count($headers) === count($row)) {
                    $data[] = array_combine($headers, $row);
                }
            }
        }
        
        return $data;
    }
    
    // Save email to database
    private function saveEmailToDatabase($emailData) {
        $db = getDB();
        
        try {
            // Check if email already exists
            $stmt = $db->prepare("SELECT id FROM email_automation WHERE email_uid = ?");
            $stmt->execute([$emailData['uid']]);
            if ($stmt->fetch()) {
                return ['success' => true, 'message' => 'Email already processed', 'existing' => true];
            }
            
            $attachmentCount = count($emailData['attachments']);
            
            // Insert email with attachment count
            $stmt = $db->prepare("INSERT INTO email_automation (email_uid, subject, from_address, from_name, to_address, date_received, body_text, body_html, is_processed, attachment_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)");
            $stmt->execute([
                $emailData['uid'],
                $emailData['subject'],
                $emailData['from_email'],
                $emailData['from'],
                $emailData['to'],
                $emailData['date'],
                $emailData['body_text'],
                $emailData['body_html'],
                $attachmentCount
            ]);
            
            $emailId = $db->lastInsertId();
            error_log("Email saved with ID: $emailId, processing " . count($emailData['attachments']) . " attachments");
            
            // Save attachments
            foreach ($emailData['attachments'] as $attachment) {
                error_log("Saving attachment: {$attachment['filename']} ({$attachment['size']} bytes)");
                $excelDataJson = isset($attachment['excel_data']) ? json_encode($attachment['excel_data']) : null;
                
                try {
                    $stmt = $db->prepare("INSERT INTO email_attachments (email_id, filename, content_type, size, file_path, excel_data, is_coupon_file) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $result = $stmt->execute([
                        $emailId,
                        $attachment['filename'],
                        $attachment['content_type'],
                        $attachment['size'],
                        $attachment['file_path'] ?? null,
                        $excelDataJson,
                        $this->isExcelFile($attachment['filename']) ? 1 : 0
                    ]);
                    
                    if ($result) {
                        $attachmentId = $db->lastInsertId();
                        error_log("Attachment saved to database: {$attachment['filename']} with ID: $attachmentId");
                    } else {
                        error_log("Failed to save attachment to database: {$attachment['filename']} - Error: " . implode(', ', $stmt->errorInfo()));
                    }
                } catch (Exception $e) {
                    error_log("Exception saving attachment to database: {$attachment['filename']} - " . $e->getMessage());
                }
            }
            
            return ['success' => true, 'email_id' => $emailId, 'attachments_count' => $attachmentCount];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}

// Helper function to run automation
function runEmailAutomation($options = []) {
    $service = new EmailAutomationService();
    
    $limit = $options['limit'] ?? 50;
    $senderEmail = $options['sender_email'] ?? null;
    $attachmentsOnly = $options['attachments_only'] ?? true;
    
    if ($senderEmail) {
        return $service->fetchEmailsFromSender($senderEmail, $limit);
    } elseif ($attachmentsOnly) {
        return $service->fetchEmailsWithAttachments($limit);
    } else {
        return $service->fetchUnreadEmails($limit);
    }
}
