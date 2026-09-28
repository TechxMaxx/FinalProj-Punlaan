<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

require_once __DIR__ . "/../../FrontEnd/connection.php";

if (!isset($_SESSION['user_id'])) {

    echo json_encode([
        'success' => false,
        'message' => 'User is not logged in.'
    ]);

    exit;
}

$data = json_decode(
    file_get_contents('php://input'),
    true
) ?? [];

$userId = (int) $_SESSION['user_id'];

$firstName = trim($data['first_name'] ?? '');
$lastName = trim($data['last_name'] ?? '');
$email = trim($data['email'] ?? '');
$phone = preg_replace('/[\s\-()]/', '', (string)($data['phone'] ?? ''));
$bio = trim($data['bio'] ?? '');

// Shop details (only saved for approved vendors)
$storeName = trim($data['store_name'] ?? '');
$storeDescription = trim($data['store_description'] ?? '');


/* ---------- Validation ---------- */

if ($firstName === '' || $lastName === '') {

    echo json_encode([
        'success' => false,
        'message' => 'First name and last name are required.'
    ]);

    exit;
}

if (mb_strlen($firstName) > 100 || mb_strlen($lastName) > 100) {

    echo json_encode([
        'success' => false,
        'message' => 'Names can be at most 100 characters.'
    ]);

    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

    echo json_encode([
        'success' => false,
        'message' => 'Please enter a valid email address.'
    ]);

    exit;
}

// A NEW email must follow the sign-up rules (real domain, no @punlaan,
// no throwaway inbox). Keeping the current email is always allowed.
$current = $conn->prepare("SELECT email FROM users WHERE user_id = ?");
$current->bind_param("i", $userId);
$current->execute();
$currentEmail = (string)($current->get_result()->fetch_row()[0] ?? '');
$current->close();

if (strcasecmp($email, $currentEmail) !== 0) {

    require_once __DIR__ . "/../../lib/email_rules.php";
    $emailProblem = emailProblem($email);

    if ($emailProblem !== null) {

        echo json_encode([
            'success' => false,
            'message' => $emailProblem
        ]);

        exit;
    }
}

if ($phone !== '' && !preg_match('/^(\+?63|0)9\d{9}$/', $phone)) {

    echo json_encode([
        'success' => false,
        'message' => 'Enter a valid mobile number, e.g. 0917 123 4567.'
    ]);

    exit;
}

if (mb_strlen($bio) > 500) {

    echo json_encode([
        'success' => false,
        'message' => 'About Me can be at most 500 characters.'
    ]);

    exit;
}


try {

    /* Check if another account uses email */

    $check = $conn->prepare("
        SELECT user_id
        FROM users
        WHERE email = ?
        AND user_id != ?
        LIMIT 1
    ");

    $check->bind_param("si", $email, $userId);
    $check->execute();

    if ($check->get_result()->num_rows > 0) {

        echo json_encode([
            'success' => false,
            'message' => 'This email is already being used by another account.'
        ]);

        exit;
    }

    $check->close();


    /* Update personal info (addresses are managed in the address book) */

    $stmt = $conn->prepare("
        UPDATE users
        SET
            first_name = ?,
            last_name = ?,
            email = ?,
            phone = NULLIF(?, ''),
            bio = NULLIF(?, '')
        WHERE user_id = ?
    ");

    $stmt->bind_param("sssssi", $firstName, $lastName, $email, $phone, $bio, $userId);
    $stmt->execute();
    $stmt->close();


    /* Shop details — approved vendors only */

    if (array_key_exists('store_name', $data)) {

        if ($storeName === '' || mb_strlen($storeName) > 100) {

            echo json_encode([
                'success' => false,
                'message' => 'Shop name is required (up to 100 characters).'
            ]);

            exit;
        }

        $stmt = $conn->prepare("
            UPDATE users
            SET store_name = ?, store_description = NULLIF(?, '')
            WHERE user_id = ? AND is_vendor = 1 AND verification_status = 2
        ");

        $stmt->bind_param("ssi", $storeName, $storeDescription, $userId);
        $stmt->execute();
        $stmt->close();
    }


    /* Keep the session name in sync (shown in headers) */

    $_SESSION['first_name'] = $firstName;
    $_SESSION['last_name'] = $lastName;
    $_SESSION['email'] = $email;


    /* New email → confirm it with a 6-digit code (VerifyEmail.html) */

    if (strcasecmp($email, $currentEmail) !== 0) {

        require_once __DIR__ . "/../../lib/email_verify.php";

        if (verificationNeeded()) {
            $stmt = $conn->prepare("UPDATE users SET email_verified = 0 WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();

            $_SESSION['verify_user_id'] = $userId;
            $_SESSION['verify_remember'] = false;
            $sent = sendVerificationCode($conn, $userId);

            $response = [
                'success' => true,
                'verify_required' => true,
                'message' => $sent['sent']
                    ? 'Profile saved. We sent a 6-digit code to your new email.'
                    : 'Profile saved. ' . $sent['message']
            ];

            // Mobile app (api/): its sign-in stops until the new email is
            // verified, so it gets a ticket for api/auth/verify instead
            if (isset($apiToken) && function_exists('apiIssueToken')) {
                apiRevokeToken($conn, $apiToken);
                $response['ticket'] = apiIssueToken($conn, $userId, 'verify', 'Punlaan Android app');
                $response['email'] = maskEmail($email);
            }

            echo json_encode($response);
            exit;
        }
    }


    echo json_encode([
        'success' => true,
        'message' => 'Profile saved.'
    ]);

} catch (Exception $e) {

    echo json_encode([
        'success' => false,
        'message' => 'Could not save your profile.'
    ]);

}
