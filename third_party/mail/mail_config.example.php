<?php

/*
|--------------------------------------------------------------------------
| EMAIL SETTINGS — "Forgot password" + order updates (placed, packed,
| shipped, delivered, cancelled), returns, reviews and payouts.
| Until this is filled in, those updates only appear in the website's
| notification bell (lib/notify.php).
|--------------------------------------------------------------------------
|
| Uses Gmail's SMTP server through PHPMailer (third_party/phpmailer/).
|
| 1. Use a Gmail account for the website (e.g. punlaan.noreply@gmail.com).
| 2. Turn on 2-Step Verification for it:
|      https://myaccount.google.com/security
| 3. Create an App Password ("Mail"):
|      https://myaccount.google.com/apppasswords
|    Google shows a 16-letter password — paste it below (spaces are fine).
|
| Keep the App Password private: don't upload this file publicly.
|
*/

define("MAIL_SMTP_HOST", "smtp.gmail.com");
define("MAIL_SMTP_PORT", 587);                       // 587 = STARTTLS
define("MAIL_USERNAME", "YOUR_GMAIL@gmail.com");       // the Gmail address
define("MAIL_APP_PASSWORD", "YOUR_APP_PASSWORD");  // the 16-letter App Password

define("MAIL_FROM_EMAIL", MAIL_USERNAME);
define("MAIL_FROM_NAME", "Punlaan");


/*
| Address of the website (used for links inside emails) comes from
| /app_config.php — local vs. online is chosen automatically there.
*/
require_once __DIR__ . "/../../app_config.php";


/* Email is ready once the placeholders above are replaced */
function mailIsConfigured(): bool
{
    return strpos(MAIL_USERNAME, "YOUR_GMAIL") === false
        && strpos(MAIL_APP_PASSWORD, "YOUR_APP_PASSWORD") === false;
}
