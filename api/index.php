<?php
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

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request method and endpoint
$method = $_SERVER['REQUEST_METHOD'];

// Parse the request path from URL
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$path = str_replace($scriptName . '/', '', $requestUri);
$path = trim($path, '/');

// Remove query string if present
$path = strtok($path, '?');
$request = $path;

// Include required files
require_once 'db.php';
require_once 'auth.php';
require_once 'email_helper.php';
require_once 'email_automation.php';

// Route the request
try {
    switch ($request) {
        // Auth routes
        case 'auth/request-otp':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $email = $data['email'] ?? '';
                if (empty($email)) {
                    jsonResponse(['success' => false, 'message' => 'Email is required'], 400);
                }
                sendOTP($email);
            }
            break;
            
        case 'auth/verify-otp':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $email = $data['email'] ?? '';
                $otp = $data['otp'] ?? '';
                if (empty($email) || empty($otp)) {
                    jsonResponse(['success' => false, 'message' => 'Email and OTP are required'], 400);
                }
                verifyOTP($email, $otp);
            }
            break;
            
        case 'auth/logout':
            if ($method === 'POST') {
                jsonResponse(['success' => true, 'message' => 'Logged out successfully']);
            }
            break;
            
        case 'auth/check-email':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $email = $data['email'] ?? '';
                checkEmail($email);
            }
            break;
            
        case 'auth/login':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $email = $data['email'] ?? '';
                $password = $data['password'] ?? '';
                loginWithPassword($email, $password);
            }
            break;
            
        case 'auth/set-password':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $email = $data['email'] ?? '';
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';
                $fullName = $data['full_name'] ?? '';
                $phone = $data['phone'] ?? '';
                setPassword($email, $username, $password, $fullName, $phone);
            }
            break;
            
        // User routes
        case 'user/profile':
            requireAuth();
            $userId = getCurrentUserId();
            $profile = getUserProfile($userId);
            jsonResponse(['success' => true, 'data' => $profile]);
            break;
            
        case 'user/business-verticals':
            requireAuth();
            $verticals = getBusinessVerticals();
            jsonResponse(['success' => true, 'data' => $verticals]);
            break;
            
        case (preg_match('#^user/merchants/vertical/([0-9]+)$#', $request, $matches) ? true : false):
            requireAuth();
            $verticalId = $matches[1];
            $merchants = getMerchants($verticalId);
            jsonResponse(['success' => true, 'data' => $merchants]);
            break;
            
        case (preg_match('#^user/merchants/([0-9]+)/applications$#', $request, $matches) ? true : false):
            requireAuth();
            $merchantId = $matches[1];
            $apps = getMerchantApplications($merchantId);
            jsonResponse(['success' => true, 'data' => $apps]);
            break;
            
        case (preg_match('#^user/merchants/([0-9]+)$#', $request, $matches) ? true : false):
            requireAuth();
            $merchantId = $matches[1];
            $merchant = getMerchantById($merchantId);
            jsonResponse(['success' => true, 'data' => $merchant]);
            break;
            
        // Admin routes
        case 'admin/login':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                adminLogin($data['username'] ?? '', $data['password'] ?? '');
            }
            break;
            
        case 'admin/business-verticals':
            if ($method === 'GET') {
                requireAuth();
                $verticals = getBusinessVerticals();
                jsonResponse(['success' => true, 'data' => $verticals]);
            } elseif ($method === 'POST') {
                requireAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                createBusinessVertical($data);
            }
            break;
            
        case (preg_match('#^admin/business-verticals/([0-9]+)$#', $request, $matches) ? true : false):
            requireAuth();
            $id = $matches[1];
            if ($method === 'PUT') {
                $data = json_decode(file_get_contents('php://input'), true);
                updateBusinessVertical($id, $data);
            } elseif ($method === 'DELETE') {
                deleteBusinessVertical($id);
            }
            break;
            
        case 'admin/merchants':
            if ($method === 'GET') {
                requireAuth();
                $merchants = getAllMerchants();
                jsonResponse(['success' => true, 'data' => $merchants]);
            } elseif ($method === 'POST') {
                requireAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                createMerchant($data);
            }
            break;
            
        case (preg_match('#^admin/merchants/([0-9]+)$#', $request, $matches) ? true : false):
            requireAuth();
            $id = $matches[1];
            if ($method === 'PUT') {
                $data = json_decode(file_get_contents('php://input'), true);
                updateMerchant($id, $data);
            } elseif ($method === 'DELETE') {
                deleteMerchant($id);
            }
            break;
            
        case 'admin/merchants/bulk-upload':
            requireAuth();
            if ($method === 'POST') {
                handleBulkUpload();
            }
            break;
            
        case 'admin/merchants/sample-template':
            requireAuth();
            downloadSampleTemplate();
            break;
            
        case 'admin/applications':
            requireAuth();
            $apps = getMerchantApplications($_GET['merchant_id'] ?? null);
            jsonResponse(['success' => true, 'data' => $apps]);
            break;
            
        // Gmail/Email routes
        case 'gmail/emails':
            requireAuth();
            if ($method === 'GET') {
                $options = [
                    'limit' => $_GET['limit'] ?? 10,
                    'query' => $_GET['query'] ?? null,
                    'senderEmail' => $_GET['senderEmail'] ?? null
                ];
                $emails = fetchEmails($options['limit'], $options);
                jsonResponse(['success' => true, 'data' => $emails]);
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $options = [
                    'limit' => $data['maxResults'] ?? 50,
                    'query' => $data['query'] ?? null,
                    'senderEmail' => $data['senderEmail'] ?? null
                ];
                $emails = fetchEmails($options['limit'], $options);
                jsonResponse(['success' => true, 'emails' => $emails, 'count' => count($emails)]);
            }
            break;
            
        case 'gmail/process-email':
        case 'gmail/process':
            requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $emailIds = $data['emailIds'] ?? ($data['email_id'] ? [$data['email_id']] : []);
            
            if (empty($emailIds)) {
                jsonResponse(['success' => false, 'message' => 'No email IDs provided'], 400);
            }
            
            $processed = 0;
            $errors = [];
            foreach ($emailIds as $emailId) {
                try {
                    processEmailAttachments($emailId);
                    $processed++;
                } catch (Exception $e) {
                    $errors[] = "Email $emailId: " . $e->getMessage();
                }
            }
            
            jsonResponse([
                'success' => true,
                'count' => $processed,
                'errors' => $errors,
                'message' => "Processed $processed email(s)"
            ]);
            break;
            
        case 'gmail/test-connection':
            requireAuth();
            $connected = testImapConnection();
            jsonResponse(['success' => $connected, 'message' => $connected ? 'IMAP connection successful' : 'IMAP connection failed']);
            break;
            
        // Data routes
        case 'data/emails':
            requireAuth();
            $date = $_GET['date'] ?? null;
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;
            $emails = getEmailsWithAttachments($date, $startDate, $endDate);
            jsonResponse(['success' => true, 'emails' => $emails, 'count' => count($emails)]);
            break;
            
        case (preg_match('#^data/excel-data/([0-9]+)$#', $request, $matches) ? true : false):
            requireAuth();
            $attachmentId = $matches[1];
            $data = getExcelDataByAttachmentId($attachmentId);
            jsonResponse(['success' => true, 'data' => $data, 'rowCount' => count($data)]);
            break;
            
        case 'data/export-formatted-excel':
            requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            exportFormattedExcel($data);
            break;
            
        case 'data/templates':
            if ($method === 'GET') {
                requireAuth();
                $templates = getAllTemplates();
                jsonResponse(['success' => true, 'templates' => $templates, 'count' => count($templates)]);
            } elseif ($method === 'POST') {
                requireAuth();
                $data = json_decode(file_get_contents('php://input'), true);
                saveTemplate($data['merchantName'] ?? '', $data['templateName'] ?? '', $data['headerRows'] ?? []);
            }
            break;
            
        case 'data/upload':
            requireAuth();
            uploadExcelFile();
            break;
            
        // Automation routes
        case 'automation/fetch-emails':
            requireAuth();
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $options = [
                'limit' => $data['limit'] ?? $_GET['limit'] ?? 50,
                'attachments_only' => $data['attachments_only'] ?? ($_GET['attachments_only'] ?? 'true') === 'true',
                'sender_email' => $data['sender_email'] ?? $_GET['sender_email'] ?? null
            ];
            $result = runEmailAutomation($options);
            jsonResponse($result);
            break;
            
        case 'automation/status':
            requireAuth();
            $db = getDB();
            $lastCronRun = getLastCronRun();
            $stats = [
                'total_emails' => $db->query("SELECT COUNT(*) as count FROM email_automation")->fetch()['count'],
                'total_attachments' => $db->query("SELECT COUNT(*) as count FROM email_attachments")->fetch()['count'],
                'processed_today' => $db->query("SELECT COUNT(*) as count FROM email_automation WHERE DATE(created_at) = CURDATE()")->fetch()['count'],
                'last_email' => $db->query("SELECT date_received, subject, from_address FROM email_automation ORDER BY date_received DESC LIMIT 1")->fetch(),
                'last_cron_run' => $lastCronRun
            ];
            jsonResponse(['success' => true, 'stats' => $stats]);
            break;
            
        case 'automation/cron-history':
            requireAuth();
            $limit = intval($_GET['limit'] ?? 10);
            $history = getCronJobHistory('email_automation', $limit);
            jsonResponse(['success' => true, 'history' => $history, 'count' => count($history)]);
            break;
            
        case 'automation/logs':
            requireAuth();
            $logFile = __DIR__ . '/logs/email_automation_' . date('Y-m-d') . '.log';
            $logs = file_exists($logFile) ? file_get_contents($logFile) : 'No logs for today';
            jsonResponse(['success' => true, 'logs' => $logs, 'file' => $logFile]);
            break;
            
        default:
            jsonResponse(['success' => false, 'message' => 'Endpoint not found'], 404);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Internal server error', 'error' => $e->getMessage()], 500);
}
