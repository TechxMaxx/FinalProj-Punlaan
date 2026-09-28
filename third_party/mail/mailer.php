<?php

/*
|--------------------------------------------------------------------------
| SEND EMAIL
|--------------------------------------------------------------------------
|
|   sendMail($toEmail, $toName, $subject, $html, $text);
|
| Returns true when sent. Throws RuntimeException with a readable reason
| when email isn't configured or Gmail refuses (wrong App Password, etc.).
|
*/

require_once __DIR__ . "/mail_config.php";
require_once __DIR__ . "/../phpmailer/Exception.php";
require_once __DIR__ . "/../phpmailer/PHPMailer.php";
require_once __DIR__ . "/../phpmailer/SMTP.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;


function sendMail(string $toEmail, string $toName, string $subject, string $html, string $text): bool
{
    if (!mailIsConfigured()) {
        throw new RuntimeException("Email is not set up yet (third_party/mail/mail_config.php).");
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = MAIL_SMTP_HOST;
        $mail->Port = MAIL_SMTP_PORT;
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Username = MAIL_USERNAME;
        $mail->Password = str_replace(" ", "", MAIL_APP_PASSWORD);
        $mail->Timeout = 15;
        $mail->CharSet = "UTF-8";

        $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $text;

        return $mail->send();

    } catch (MailerException $e) {
        error_log("Punlaan mailer: " . $mail->ErrorInfo);
        throw new RuntimeException("Could not send email: " . $mail->ErrorInfo);
    }
}
