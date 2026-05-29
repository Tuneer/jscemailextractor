<?php
// Auth helper

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

// JWT Configuration
$jwt_secret = getenv('JWT_SECRET') ?: 'emailextractor2655-secret-key';

// Admin Configuration
$ADMIN_EMAIL = getenv('ADMIN_EMAIL') ?: 'admin@jscglobalsolutions.info';
$ADMIN_OTP = getenv('ADMIN_OTP') ?: '123456';

require_once __DIR__ . '/db.php';

function generateJWT($userId, $email, $role = 'user') {
    global $jwt_secret;
    $payload = ['user_id' => $userId, 'email' => $email, 'role' => $role, 'iat' => time(), 'exp' => time() + 86400];
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payloadEncoded = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$header.$payloadEncoded", $jwt_secret);
    return "$header.$payloadEncoded.$signature";
}

function verifyJWT($token) {
    global $jwt_secret;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    $expected = hash_hmac('sha256', $parts[0] . '.' . $parts[1], $jwt_secret);
    if ($parts[2] !== $expected) return false;
    $data = json_decode(base64_decode($parts[1]), true);
    if ($data['exp'] < time()) return false;
    return $data;
}

function getAuthorizationHeader() {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    return str_replace('Bearer ', '', $auth);
}

function requireAuth() {
    $token = getAuthorizationHeader();
    if (!$token) jsonResponse(['success' => false, 'message' => 'No token'], 401);
    $payload = verifyJWT($token);
    if (!$payload) jsonResponse(['success' => false, 'message' => 'Invalid token'], 401);
    return $payload;
}

function getCurrentUserId() {
    $payload = requireAuth();
    return $payload['user_id'];
}

function isAdmin() {
    $payload = requireAuth();
    return isset($payload['role']) && in_array($payload['role'], ['admin', 'super_admin']);
}

function checkEmail($emailOrUsername) {
    global $ADMIN_EMAIL;
    
    if (empty($emailOrUsername)) {
        jsonResponse(['success' => false, 'message' => 'Email or Username required'], 400);
    }
    
    $isAdmin = (strtolower($emailOrUsername) === strtolower($ADMIN_EMAIL));
    $userExists = false;
    
    if (!$isAdmin) {
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
        $stmt->execute([$emailOrUsername, $emailOrUsername]);
        $userExists = $stmt->fetch() !== false;
    }
    
    jsonResponse([
        'success' => true,
        'is_admin' => $isAdmin,
        'user_exists' => $userExists,
        'message' => $isAdmin ? 'Admin account' : ($userExists ? 'User found' : 'New user')
    ]);
}

function loginWithPassword($emailOrUsername, $password) {
    global $ADMIN_EMAIL, $ADMIN_OTP;
    
    if (empty($emailOrUsername) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Email/Username and password required'], 400);
    }
    
    // Check admin login by email
    if (strtolower($emailOrUsername) === strtolower($ADMIN_EMAIL)) {
        if ($password === $ADMIN_OTP) {
            $db = getDB();
            $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$ADMIN_EMAIL]);
            $admin = $stmt->fetch();
            
            if (!$admin) {
                $stmt = $db->prepare("INSERT INTO users (email, username, password_hash, full_name, role) VALUES (?, 'admin', ?, 'Administrator', 'super_admin')");
                $stmt->execute([$ADMIN_EMAIL, password_hash($ADMIN_OTP, PASSWORD_DEFAULT)]);
                $adminId = $db->lastInsertId();
            } else {
                $adminId = $admin['id'];
            }
            
            $token = generateJWT($adminId, $ADMIN_EMAIL, 'super_admin');
            $stmt = $db->prepare("INSERT INTO login_history (user_id, email, ip_address, login_status) VALUES (?, ?, ?, 'success')");
            $stmt->execute([$adminId, $ADMIN_EMAIL, $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
            
            jsonResponse([
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
                'user' => ['id' => $adminId, 'email' => $ADMIN_EMAIL, 'role' => 'super_admin'],
                'is_admin' => true
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
        }
        return;
    }
    
    // Regular user password login - check by username OR email
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
    $stmt->execute([$emailOrUsername, $emailOrUsername]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'User not found'], 404);
    }
    
    if (!password_verify($password, $user['password_hash'])) {
        // Log failed attempt
        $stmt = $db->prepare("INSERT INTO login_history (user_id, email, ip_address, login_status) VALUES (?, ?, ?, 'failed')");
        $stmt->execute([$user['id'], $user['email'], $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
        jsonResponse(['success' => false, 'message' => 'Invalid password'], 401);
    }
    
    $token = generateJWT($user['id'], $user['email'], $user['role'] ?? 'user');
    $stmt = $db->prepare("INSERT INTO login_history (user_id, email, ip_address, login_status) VALUES (?, ?, ?, 'success')");
    $stmt->execute([$user['id'], $user['email'], $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
    
    jsonResponse([
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'user' => ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'] ?? 'user'],
        'is_admin' => false
    ]);
}

function setPassword($email, $username, $password, $fullName = '', $phone = '') {
    if (empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Email and password required'], 400);
    }
    
    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    if (!$user) {
        // Create new user with password
        $username = $username ?: explode('@', $email)[0];
        $stmt = $db->prepare("INSERT INTO users (email, username, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, 'user')");
        $stmt->execute([$email, $username, $passwordHash, $fullName, $phone]);
        $userId = $db->lastInsertId();
    } else {
        // Update existing user
        if ($username) {
            $stmt = $db->prepare("UPDATE users SET password_hash = ?, username = COALESCE(NULLIF(?, ''), username), full_name = COALESCE(NULLIF(?, ''), full_name), phone = COALESCE(NULLIF(?, ''), phone) WHERE email = ?");
            $stmt->execute([$passwordHash, $username, $fullName, $phone, $email]);
        } else {
            $stmt = $db->prepare("UPDATE users SET password_hash = ?, full_name = COALESCE(NULLIF(?, ''), full_name), phone = COALESCE(NULLIF(?, ''), phone) WHERE email = ?");
            $stmt->execute([$passwordHash, $fullName, $phone, $email]);
        }
        $userId = $user['id'];
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Password set successfully',
        'user' => ['id' => $userId, 'email' => $email, 'role' => 'user']
    ]);
}

function generateOTP() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function sendOTP($emailOrUsername) {
    global $ADMIN_EMAIL;
    
    if (empty($emailOrUsername)) jsonResponse(['success' => false, 'message' => 'Email or Username required'], 400);
    
    // Check if this is admin email
    if (strtolower($emailOrUsername) === strtolower($ADMIN_EMAIL)) {
        // Admin login - no need to send OTP, use fixed OTP
        jsonResponse([
            'success' => true, 
            'message' => 'Admin recognized. Please enter your OTP.',
            'is_admin' => true
        ]);
    }
    
    // Regular user - check if exists by email OR username
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
    $stmt->execute([$emailOrUsername, $emailOrUsername]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // New user - auto register
        $username = explode('@', $emailOrUsername)[0];
        $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, 'user')");
        $stmt->execute([$emailOrUsername, $username, $passwordHash]);
        $userId = $db->lastInsertId();
    } else {
        $userId = $user['id'];
    }
    
    // Get email for OTP
    $email = $user ? $user['email'] : $emailOrUsername;
    
    // Generate and store OTP
    $otp = generateOTP();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    $stmt = $db->prepare("INSERT INTO otp_codes (email, otp_code, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$email, $otp, $expiresAt]);
    
    // Send OTP via email
    $subject = "Your OTP Code - Email Extractor";
    $message = "<html><body style='font-family: Arial, sans-serif; padding: 20px;'>";
    $message .= "<h2>Email Extractor - OTP Verification</h2>";
    $message .= "<p>Your OTP is: <strong style='font-size: 24px; color: #667eea;'>$otp</strong></p>";
    $message .= "<p>Valid for 10 minutes.</p>";
    $message .= "<p>If you didn't request this, please ignore this email.</p>";
    $message .= "</body></html>";
    
    // Email headers
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: Email Extractor <noreply@jscglobalsolutions.info>" . "\r\n";
    $headers .= "Reply-To: noreply@jscglobalsolutions.info" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    // Additional parameters for sendmail
    $params = "-f noreply@jscglobalsolutions.info";
    
    // Try to send email
    $emailSent = @mail($email, $subject, $message, $headers, $params);
    
    jsonResponse([
        'success' => true, 
        'message' => 'OTP sent to your email', 
        'is_admin' => false,
        'dev_otp' => $otp // Remove in production
    ]);
}

function verifyOTP($emailOrUsername, $otp) {
    global $ADMIN_EMAIL, $ADMIN_OTP;
    
    if (empty($emailOrUsername) || empty($otp)) {
        jsonResponse(['success' => false, 'message' => 'Email/Username and OTP required'], 400);
    }
    
    // Check if admin login
    if (strtolower($emailOrUsername) === strtolower($ADMIN_EMAIL)) {
        if ($otp === $ADMIN_OTP) {
            // Admin login successful
            $db = getDB();
            $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$ADMIN_EMAIL]);
            $admin = $stmt->fetch();
            
            if (!$admin) {
                // Create admin if not exists
                $stmt = $db->prepare("INSERT INTO users (email, username, password_hash, full_name, role) VALUES (?, 'admin', ?, 'Administrator', 'super_admin')");
                $stmt->execute([$ADMIN_EMAIL, password_hash($ADMIN_OTP, PASSWORD_DEFAULT)]);
                $adminId = $db->lastInsertId();
            } else {
                $adminId = $admin['id'];
            }
            
            $token = generateJWT($adminId, $ADMIN_EMAIL, 'super_admin');
            
            // Log login history
            $stmt = $db->prepare("INSERT INTO login_history (user_id, email, ip_address, login_status) VALUES (?, ?, ?, 'success')");
            $stmt->execute([$adminId, $ADMIN_EMAIL, $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
            
            jsonResponse([
                'success' => true, 
                'message' => 'Admin login successful', 
                'token' => $token, 
                'user' => ['id' => $adminId, 'email' => $ADMIN_EMAIL, 'role' => 'super_admin'],
                'is_admin' => true
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Invalid OTP'], 400);
        }
        return;
    }
    
    // Regular user OTP verification
    $db = getDB();
    
    // First get user by email OR username
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
    $stmt->execute([$emailOrUsername, $emailOrUsername]);
    $user = $stmt->fetch();
    
    // Use the actual email from user record
    $email = $user ? $user['email'] : $emailOrUsername;
    
    // Verify OTP
    $stmt = $db->prepare("SELECT * FROM otp_codes WHERE email = ? AND otp_code = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$email, $otp]);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        jsonResponse(['success' => false, 'message' => 'Invalid or expired OTP'], 400);
    }
    
    // Mark OTP as used
    $stmt = $db->prepare("UPDATE otp_codes SET used = 1 WHERE id = ?");
    $stmt->execute([$otpRecord['id']]);
    
    if (!$user) {
        $username = explode('@', $email)[0];
        $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, 'user')");
        $stmt->execute([$email, $username, $passwordHash]);
        $userId = $db->lastInsertId();
    } else {
        $userId = $user['id'];
    }
    
    $token = generateJWT($userId, $email, 'user');
    
    // Log login history
    $stmt = $db->prepare("INSERT INTO login_history (user_id, email, ip_address, login_status) VALUES (?, ?, ?, 'success')");
    $stmt->execute([$userId, $email, $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
    
    jsonResponse([
        'success' => true, 
        'message' => 'Login successful', 
        'token' => $token, 
        'user' => ['id' => $userId, 'email' => $email, 'role' => 'user'],
        'is_admin' => false
    ]);
}
