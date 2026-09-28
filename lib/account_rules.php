<?php

/*
|--------------------------------------------------------------------------
| SIGN-IN + SIGN-UP RULES (website and mobile app)
|--------------------------------------------------------------------------
|
|   loginCheck($conn, $email, $password)
|       ["ok" => false, "error" => [json for the page]]
|       ["ok" => true, "user" => row, "needs_verify" => bool]
|
|   createAccount($conn, $firstName, $lastName, $email, $password)
|       ["ok" => false, "error" => [json for the page]]
|       ["ok" => true, "user_id" => id, "needs_verify" => bool]
|
| Used by register/login.php, register/register.php and api/auth.php,
| so the website and the app always follow the same rules.
|
*/

require_once __DIR__ . "/email_rules.php";
require_once __DIR__ . "/email_verify.php";


function loginCheck(mysqli $conn, string $email, string $password): array
{
    $fail = fn(array $error) => ["ok" => false, "error" => ["success" => false] + $error];

    if ($email === "" || $password === "") {
        return $fail(["message" => "Please enter your email and password."]);
    }

    $stmt = $conn->prepare("
        SELECT user_id, first_name, last_name, email, password, email_verified,
               store_name, is_vendor, verification_status, account_status
        FROM users
        WHERE email = ?
        LIMIT 1
    ");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        // The page shows this under the fields with a "Create an account" link
        return $fail([
            "code" => "no_account",
            "field" => "email",
            "message" => "No account found with this email."
        ]);
    }

    if (!password_verify($password, $user["password"])) {
        return $fail([
            "code" => "wrong_password",
            "field" => "password",
            "message" => "Incorrect password. Try again or use \"Forgot password?\"."
        ]);
    }

    if ((int)$user["account_status"] === 2) {
        return $fail(["message" => "Your account has been blocked. Please contact support."]);
    }

    if ((int)$user["account_status"] === 1) {
        return $fail(["message" => "Your account has been suspended."]);
    }

    if ((int)$user["is_vendor"] === 1 && (int)$user["verification_status"] === 1) {
        return $fail([
            "vendor_pending" => true,
            "message" => "Your vendor account is awaiting verification."
        ]);
    }

    if ((int)$user["is_vendor"] === 1 && (int)$user["verification_status"] === 3) {
        return $fail(["message" => "Your vendor verification was rejected."]);
    }

    unset($user["password"]);

    $needsVerify = false;

    if ((int)$user["email_verified"] !== 1) {
        if (verificationNeeded()) {
            $needsVerify = true;
        } else {
            // Email isn't set up on this server → nobody could get a code
            markEmailVerified($conn, (int)$user["user_id"]);
        }
    }

    return ["ok" => true, "user" => $user, "needs_verify" => $needsVerify];
}


function createAccount(mysqli $conn, string $firstName, string $lastName, string $email, string $password): array
{
    $fail = fn(array $error) => ["ok" => false, "error" => ["success" => false] + $error];

    if ($firstName === "" || $lastName === "" || $email === "" || $password === "") {
        return $fail(["message" => "Please complete all required fields."]);
    }

    // Real, reachable address only (no @punlaan, no throwaway inboxes)
    $emailProblem = emailProblem($email);

    if ($emailProblem !== null) {
        return $fail(["field" => "email", "message" => $emailProblem]);
    }

    $check = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();
    $taken = $check->num_rows > 0;
    $check->close();

    if ($taken) {
        return $fail(["field" => "email", "message" => "Email is already registered."]);
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Everyone signs up as a buyer; selling is applied for later in
    // Profile → Selling (with ID documents), not on the sign-up form
    $storeName = null;
    $isVendor = 0;
    $verificationStatus = 0;
    $accountStatus = 0;
    // Email sign-ups confirm their address with a 6-digit code first
    $emailVerified = verificationNeeded() ? 0 : 1;

    $stmt = $conn->prepare("
        INSERT INTO users
            (first_name, last_name, store_name, email, password,
             is_vendor, verification_status, account_status, email_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param(
        "sssssiiii",
        $firstName,
        $lastName,
        $storeName,
        $email,
        $hashedPassword,
        $isVendor,
        $verificationStatus,
        $accountStatus,
        $emailVerified
    );

    if (!$stmt->execute()) {
        error_log("Punlaan sign-up: " . $stmt->error);
        $stmt->close();
        return $fail(["message" => "Could not create your account. Please try again."]);
    }

    $userId = (int)$stmt->insert_id;
    $stmt->close();

    return ["ok" => true, "user_id" => $userId, "needs_verify" => !$emailVerified];
}
