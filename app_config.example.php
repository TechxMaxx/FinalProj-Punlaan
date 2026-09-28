<?php

/*
|--------------------------------------------------------------------------
| PUNLAAN — SITE SETTINGS (one place for database + website address)
|--------------------------------------------------------------------------
|
| The same files work on your computer (XAMPP) and on the web host:
|   - opened as http://localhost/...  → LOCAL settings below
|   - opened on the real domain        → ONLINE settings below
|
| Used by FrontEnd/connection.php, PunlaanAdmin/connection.php and
| third_party/mail/mail_config.php.
|
*/

// Philippine time for PHP too (matches the database — see FrontEnd/connection.php)
date_default_timezone_set('Asia/Manila');

$requestHost = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));

// The Android emulator (10.0.2.2) and phones on your Wi-Fi (192.168.x.x)
// reach XAMPP through a private address — those count as local too.
$isPrivateIp = filter_var($requestHost, FILTER_VALIDATE_IP)
    && !filter_var($requestHost, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);

define('IS_LOCAL', PHP_SAPI === 'cli' || $isPrivateIp || in_array($requestHost, ['localhost', ''], true));


if (IS_LOCAL) {

    /* ---------- LOCAL (XAMPP on your computer) ---------- */

    define('DB_HOST', 'localhost');
    define('DB_NAME', 'punlaan3');
    define('DB_USER', 'root');
    define('DB_PASS', '');

    define('APP_URL', 'http://localhost/punlaan');

} else {

    /* ---------- ONLINE (InfinityFree) ----------
     | Copy these from InfinityFree → Control Panel → MySQL Databases.
     | APP_URL = your site address, https, no slash at the end.
     */

    define('DB_HOST', 'YOUR_DB_HOST');   // "MySQL Hostname"
    define('DB_NAME', 'YOUR_DB_NAME');      // "MySQL Database Name"
    define('DB_USER', 'YOUR_DB_USER');               // "MySQL Username"
    define('DB_PASS', 'YOUR_HOSTING_DB_PASSWORD');       // your hosting account password

    define('APP_URL', 'https://punlaan-market.free.nf');

    // Never show PHP error details to visitors online
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}
