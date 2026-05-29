<?php
// Database helper

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
if (!isset($db_config)) {
    $db_config = [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'name' => getenv('DB_NAME') ?: 'jsc_emailextractor',
        'user' => getenv('DB_USER') ?: 'JSCTuneer',
        'pass' => getenv('DB_PASS') ?: 'Jsc@2655@1011'
    ];
}

function getDB() {
    global $db_config;
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host={$db_config['host']};dbname={$db_config['name']};charset=utf8mb4";
            $pdo = new PDO($dsn, $db_config['user'], $db_config['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        } catch (PDOException $e) { throw new Exception("DB Error: " . $e->getMessage()); }
    }
    return $pdo;
}

function jsonResponse($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }
function getUserProfile($userId) { $db = getDB(); $stmt = $db->prepare("SELECT id, email, username FROM users WHERE id = ?"); $stmt->execute([$userId]); return $stmt->fetch(); }
function getBusinessVerticals() { $db = getDB(); return $db->query("SELECT * FROM business_verticals WHERE is_active = 1 ORDER BY name")->fetchAll(); }
function createBusinessVertical($data) { $db = getDB(); $stmt = $db->prepare("INSERT INTO business_verticals (name, description, icon) VALUES (?, ?, ?)"); $stmt->execute([$data['name'] ?? '', $data['description'] ?? '', $data['icon'] ?? '']); jsonResponse(['success' => true, 'id' => $db->lastInsertId()]); }
function updateBusinessVertical($id, $data) { $db = getDB(); $stmt = $db->prepare("UPDATE business_verticals SET name = ?, description = ?, is_active = ? WHERE id = ?"); $stmt->execute([$data['name'] ?? '', $data['description'] ?? '', $data['is_active'] ?? 1, $id]); jsonResponse(['success' => true]); }
function deleteBusinessVertical($id) { $db = getDB(); $stmt = $db->prepare("UPDATE business_verticals SET is_active = 0 WHERE id = ?"); $stmt->execute([$id]); jsonResponse(['success' => true]); }
function getAllMerchants() { $db = getDB(); return $db->query("SELECT m.*, bv.name as vertical_name FROM merchants m LEFT JOIN business_verticals bv ON m.business_vertical_id = bv.id WHERE m.is_active = 1 ORDER BY m.business_name")->fetchAll(); }
function getMerchants($verticalId = null) { $db = getDB(); if ($verticalId) { $stmt = $db->prepare("SELECT * FROM merchants WHERE business_vertical_id = ? AND is_active = 1 ORDER BY business_name"); $stmt->execute([$verticalId]); return $stmt->fetchAll(); } return $db->query("SELECT * FROM merchants WHERE is_active = 1 ORDER BY business_name")->fetchAll(); }
function getMerchantById($id) { $db = getDB(); $stmt = $db->prepare("SELECT m.*, bv.name as vertical_name FROM merchants m LEFT JOIN business_verticals bv ON m.business_vertical_id = bv.id WHERE m.id = ?"); $stmt->execute([$id]); return $stmt->fetch(); }
function createMerchant($data) { $db = getDB(); $stmt = $db->prepare("INSERT INTO merchants (business_name, business_vertical_id, contact_person, email, phone, address, city, state, country, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"); $stmt->execute([$data['business_name'] ?? '', $data['business_vertical_id'] ?? null, $data['contact_person'] ?? '', $data['email'] ?? '', $data['phone'] ?? '', $data['address'] ?? '', $data['city'] ?? '', $data['state'] ?? '', $data['country'] ?? '', $data['website'] ?? '']); jsonResponse(['success' => true, 'id' => $db->lastInsertId()]); }
function updateMerchant($id, $data) { $db = getDB(); $stmt = $db->prepare("UPDATE merchants SET business_name = ?, business_vertical_id = ?, contact_person = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, country = ?, website = ? WHERE id = ?"); $stmt->execute([$data['business_name'] ?? '', $data['business_vertical_id'] ?? null, $data['contact_person'] ?? '', $data['email'] ?? '', $data['phone'] ?? '', $data['address'] ?? '', $data['city'] ?? '', $data['state'] ?? '', $data['country'] ?? '', $data['website'] ?? '', $id]); jsonResponse(['success' => true]); }
function deleteMerchant($id) { $db = getDB(); $stmt = $db->prepare("UPDATE merchants SET is_active = 0 WHERE id = ?"); $stmt->execute([$id]); jsonResponse(['success' => true]); }
function getMerchantApplications($merchantId = null) { $db = getDB(); if ($merchantId) { $stmt = $db->prepare("SELECT ma.*, m.business_name FROM merchant_applications ma JOIN merchants m ON ma.merchant_id = m.id WHERE ma.merchant_id = ? AND ma.is_active = 1"); $stmt->execute([$merchantId]); return $stmt->fetchAll(); } return $db->query("SELECT ma.*, m.business_name FROM merchant_applications ma JOIN merchants m ON ma.merchant_id = m.id WHERE ma.is_active = 1")->fetchAll(); }
function getAllTemplates() { $db = getDB(); return $db->query("SELECT * FROM merchant_templates ORDER BY merchant_name, template_name")->fetchAll(); }
function saveTemplate($merchantName, $templateName, $headerRows) { $db = getDB(); $stmt = $db->prepare("INSERT INTO merchant_templates (merchant_name, template_name, header_rows) VALUES (?, ?, ?)"); $stmt->execute([$merchantName, $templateName, json_encode($headerRows)]); jsonResponse(['success' => true, 'templateId' => $db->lastInsertId()]); }
function getEmailsWithAttachments($date = null, $startDate = null, $endDate = null) { 
    $db = getDB(); 
    
    // First, get all emails
    $sql = "SELECT * FROM email_automation WHERE 1=1";
    $params = [];
    
    if ($date) {
        $sql .= " AND DATE(date_received) = ?";
        $params[] = $date;
    } elseif ($startDate && $endDate) {
        $sql .= " AND DATE(date_received) BETWEEN ? AND ?";
        $params[] = $startDate;
        $params[] = $endDate;
    } elseif ($startDate) {
        $sql .= " AND DATE(date_received) >= ?";
        $params[] = $startDate;
    } elseif ($endDate) {
        $sql .= " AND DATE(date_received) <= ?";
        $params[] = $endDate;
    }
    
    $sql .= " ORDER BY date_received DESC";
    
    if (!empty($params)) {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $emails = $stmt->fetchAll();
    } else {
        $emails = $db->query($sql)->fetchAll();
    }
    
    // Then, get attachments for each email
    foreach ($emails as &$email) {
        $stmt = $db->prepare("SELECT id, filename, content_type, size, file_path, is_coupon_file FROM email_attachments WHERE email_id = ?");
        $stmt->execute([$email['id']]);
        $email['attachments'] = $stmt->fetchAll();
    }
    
    return $emails;
}
function getExcelDataByAttachmentId($attachmentId) { $db = getDB(); $stmt = $db->prepare("SELECT excel_data FROM email_attachments WHERE id = ?"); $stmt->execute([$attachmentId]); $row = $stmt->fetch(); if ($row && $row['excel_data']) { $data = json_decode($row['excel_data'], true); return is_array($data) ? $data : []; } return []; }
function getCouponFamilies($attachmentId) { $db = getDB(); $stmt = $db->prepare("SELECT * FROM coupon_families WHERE attachment_id = ?"); $stmt->execute([$attachmentId]); return $stmt->fetchAll(); }
function saveCouponFamilyData($data) { $db = getDB(); $stmt = $db->prepare("INSERT INTO coupon_families (attachment_id, family_name, additional_info) VALUES (?, ?, ?)"); $stmt->execute([$data['attachment_id'] ?? null, $data['family_name'] ?? '', $data['additional_info'] ?? null]); jsonResponse(['success' => true, 'id' => $db->lastInsertId()]); }
function startScraping($familyId) { $db = getDB(); $stmt = $db->prepare("INSERT INTO scraping_jobs (family_id, status, started_at) VALUES (?, 'running', NOW())"); $stmt->execute([$familyId]); jsonResponse(['success' => true, 'job_id' => $db->lastInsertId(), 'status' => 'running']); }
function getScrapingStatus($jobId) { $db = getDB(); $stmt = $db->prepare("SELECT * FROM scraping_jobs WHERE id = ?"); $stmt->execute([$jobId]); jsonResponse(['success' => true, 'job' => $stmt->fetch()]); }
function comparePrice($itemId, $merchantId, $price) { $db = getDB(); $stmt = $db->prepare("INSERT INTO price_comparison (item_id, merchant_id, price, compared_at) VALUES (?, ?, ?, NOW())"); $stmt->execute([$itemId, $merchantId, $price]); jsonResponse(['success' => true, 'id' => $db->lastInsertId()]); }
function getPriceComparisons($itemId, $merchantId) { $db = getDB(); $stmt = $db->prepare("SELECT * FROM price_comparison WHERE item_id = ? AND merchant_id = ? ORDER BY compared_at DESC"); $stmt->execute([$itemId, $merchantId]); return $stmt->fetchAll(); }
function getCouponProducts($itemId) { $db = getDB(); $stmt = $db->prepare("SELECT * FROM coupon_items WHERE family_id = ?"); $stmt->execute([$itemId]); return $stmt->fetchAll(); }
function generateAnalytics($merchantId, $familyId) { $db = getDB(); $stmt = $db->prepare("INSERT INTO sales_analytics_summary (merchant_id, family_id, generated_at) VALUES (?, ?, NOW())"); $stmt->execute([$merchantId, $familyId]); jsonResponse(['success' => true, 'id' => $db->lastInsertId()]); }
function getAnalytics($merchantId, $familyId) { $db = getDB(); $stmt = $db->prepare("SELECT * FROM sales_analytics_summary WHERE merchant_id = ? AND family_id = ? ORDER BY generated_at DESC"); $stmt->execute([$merchantId, $familyId]); return $stmt->fetchAll(); }
function saveEmailMetadata($uid, $subject, $from, $to, $date, $bodyText, $userId, $merchantId) { $db = getDB(); $stmt = $db->prepare("INSERT INTO email_automation (email_uid, subject, from_address, to_address, date_received, body_text, user_id, merchant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"); $stmt->execute([$uid, $subject, $from, $to, $date, $bodyText, $userId, $merchantId]); return $db->lastInsertId(); }
function saveEmailAttachment($emailId, $filename, $contentType, $size, $filePath, $excelData) { $db = getDB(); $stmt = $db->prepare("INSERT INTO email_attachments (email_id, filename, content_type, size, file_path, excel_data, is_coupon_file) VALUES (?, ?, ?, ?, ?, ?, ?)"); $stmt->execute([$emailId, $filename, $contentType, $size, $filePath, $excelData, ($excelData !== null) ? 1 : 0]); return $db->lastInsertId(); }
function adminLogin($username, $password) { $db = getDB(); $stmt = $db->prepare("SELECT * FROM admin_users WHERE username = ?"); $stmt->execute([$username]); $admin = $stmt->fetch(); if ($admin && password_verify($password, $admin['password_hash'])) { $token = generateJWT($admin['id'], $admin['username']); jsonResponse(['success' => true, 'token' => $token, 'admin' => ['id' => $admin['id'], 'username' => $admin['username']]]); } jsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401); }
function automateEmails($merchantId) { $db = getDB(); if ($merchantId) { $stmt = $db->prepare("SELECT * FROM email_automation WHERE merchant_id = ? ORDER BY date_received DESC"); $stmt->execute([$merchantId]); } else { $stmt = $db->query("SELECT * FROM email_automation ORDER BY date_received DESC"); } $emails = $stmt->fetchAll(); jsonResponse(['success' => true, 'emails' => $emails, 'count' => count($emails)]); }

// Cron job logging functions
function createCronJobLogsTable() {
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS cron_job_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_name VARCHAR(100) NOT NULL,
        started_at DATETIME NOT NULL,
        completed_at DATETIME NULL,
        status ENUM('running', 'completed', 'failed') DEFAULT 'running',
        emails_processed INT DEFAULT 0,
        emails_new INT DEFAULT 0,
        emails_duplicate INT DEFAULT 0,
        attachments_saved INT DEFAULT 0,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
}

function logCronJobStart($jobName = 'email_automation') {
    createCronJobLogsTable();
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO cron_job_logs (job_name, started_at, status) VALUES (?, NOW(), 'running')");
    $stmt->execute([$jobName]);
    return $db->lastInsertId();
}

function logCronJobComplete($logId, $data) {
    $db = getDB();
    $stmt = $db->prepare("UPDATE cron_job_logs SET completed_at = NOW(), status = ?, emails_processed = ?, emails_new = ?, emails_duplicate = ?, attachments_saved = ?, error_message = ? WHERE id = ?");
    $stmt->execute([
        $data['status'] ?? 'completed',
        $data['emails_processed'] ?? 0,
        $data['emails_new'] ?? 0,
        $data['emails_duplicate'] ?? 0,
        $data['attachments_saved'] ?? 0,
        $data['error_message'] ?? null,
        $logId
    ]);
}

function getLastCronRun($jobName = 'email_automation') {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM cron_job_logs WHERE job_name = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1");
    $stmt->execute([$jobName]);
    return $stmt->fetch();
}

function getCronJobHistory($jobName = 'email_automation', $limit = 10) {
    $db = getDB();
    $limit = (int) $limit; // Cast to integer to avoid SQL syntax error
    $stmt = $db->prepare("SELECT * FROM cron_job_logs WHERE job_name = ? ORDER BY started_at DESC LIMIT $limit");
    $stmt->execute([$jobName]);
    return $stmt->fetchAll();
}

function exportFormattedExcel($data) {
    $attachmentId = $data['attachmentId'] ?? null;
    $templateId = $data['templateId'] ?? null;
    $fileName = $data['fileName'] ?? 'formatted_excel_' . time() . '.xlsx';
    
    if (!$attachmentId) {
        jsonResponse(['success' => false, 'message' => 'Attachment ID required'], 400);
    }
    
    $excelData = getExcelDataByAttachmentId($attachmentId);
    if (empty($excelData)) {
        jsonResponse(['success' => false, 'message' => 'No data found'], 404);
    }
    
    // Create CSV content (simple approach without PhpSpreadsheet)
    $csvContent = '';
    
    // Add template header rows if provided
    if ($templateId) {
        $db = getDB();
        $stmt = $db->prepare("SELECT header_rows FROM merchant_templates WHERE id = ?");
        $stmt->execute([$templateId]);
        $template = $stmt->fetch();
        if ($template && $template['header_rows']) {
            $headerRows = json_decode($template['header_rows'], true);
            if (is_array($headerRows)) {
                foreach ($headerRows as $row) {
                    if (is_array($row)) {
                        $csvContent .= implode(',', array_map(function($v) { return '"' . str_replace('"', '""', $v ?? '') . '"'; }, $row)) . "\n";
                    }
                }
            }
        }
    }
    
    // Add empty rows for spacing
    for ($i = 0; $i < 5; $i++) {
        $csvContent .= "\n";
    }
    
    // Add Excel data
    if (!empty($excelData)) {
        $headers = array_keys($excelData[0]);
        $csvContent .= implode(',', $headers) . "\n";
        foreach ($excelData as $row) {
            $csvContent .= implode(',', array_map(function($v) { return '"' . str_replace('"', '""', $v ?? '') . '"'; }, $row)) . "\n";
        }
    }
    
    // Output as CSV file
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $fileName . '"');
    echo $csvContent;
    exit;
}

// Bulk upload merchants from CSV/Excel
function handleBulkUpload() {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['success' => false, 'message' => 'No file uploaded or upload error'], 400);
    }
    
    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    $data = [];
    if ($ext === 'csv') {
        $handle = fopen($file['tmp_name'], 'r');
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== false) {
            $data[] = array_combine($headers, $row);
        }
        fclose($handle);
    } elseif (in_array($ext, ['xlsx', 'xls'])) {
        // For Excel, we'll use a simple approach - require PhpSpreadsheet or similar
        // For now, return an error suggesting CSV format
        jsonResponse(['success' => false, 'message' => 'Please upload CSV format. Excel support requires PhpSpreadsheet library.'], 400);
    } else {
        jsonResponse(['success' => false, 'message' => 'Unsupported file format. Use CSV.'], 400);
    }
    
    $db = getDB();
    $imported = 0;
    $errors = [];
    
    foreach ($data as $index => $row) {
        try {
            $stmt = $db->prepare("INSERT INTO merchants (business_name, business_vertical_id, contact_person, email, phone, address, city, state, country, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $row['business_name'] ?? $row['name'] ?? '',
                $row['business_vertical_id'] ?? $row['vertical_id'] ?? null,
                $row['contact_person'] ?? $row['contact'] ?? '',
                $row['email'] ?? '',
                $row['phone'] ?? '',
                $row['address'] ?? '',
                $row['city'] ?? '',
                $row['state'] ?? '',
                $row['country'] ?? '',
                $row['website'] ?? ''
            ]);
            $imported++;
        } catch (Exception $e) {
            $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
        }
    }
    
    jsonResponse([
        'success' => true, 
        'imported' => $imported, 
        'total' => count($data),
        'errors' => $errors,
        'message' => "Imported $imported of " . count($data) . " merchants"
    ]);
}

// Download sample template for bulk upload
function downloadSampleTemplate() {
    $filename = 'merchant_template.csv';
    $headers = ['business_name', 'business_vertical_id', 'contact_person', 'email', 'phone', 'address', 'city', 'state', 'country', 'website'];
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    fputcsv($output, $headers);
    // Add sample row
    fputcsv($output, ['Sample Business', '1', 'John Doe', 'john@example.com', '1234567890', '123 Main St', 'New York', 'NY', 'USA', 'https://example.com']);
    fclose($output);
    exit;
}
