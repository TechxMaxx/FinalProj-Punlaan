<?php

/*
|--------------------------------------------------------------------------
| GOOGLE / FACEBOOK ACCOUNTS (website + mobile app)
|--------------------------------------------------------------------------
|
|   socialResolveUser($conn, $column, $label, $providerId, $email,
|                     $firstName, $lastName, $mode)
|
| Finds the Punlaan account for an already-verified Google / Facebook
| user, links it to an existing email account, or creates a new buyer
| account. Used by third_party/social_auth.php (website) and
| api/auth.php (mobile app).
|
|   $column  "google_id" or "facebook_id"
|   $label   "Google" / "Facebook" (for messages)
|   $mode    "login"    → only existing accounts
|            "register" → only new accounts
|            "any"      → sign in, or create the account (mobile app)
|
| Returns ["ok" => true, "user" => row, "created" => bool]
|      or ["ok" => false, "error" => [json for the page]]
| Also records the login (last_login; the provider verified the email).
|
*/

function socialResolveUser(mysqli $conn, string $column, string $label, string $providerId, ?string $email, string $firstName, string $lastName, string $mode): array
{
    $fail = fn(array $error) => ["ok" => false, "error" => ["success" => false] + $error];

    if (!in_array($column, ["google_id", "facebook_id"], true)) {
        return $fail(["message" => "Unknown login provider."]);
    }

    if ($firstName === "" && $email) {
        $firstName = strstr($email, "@", true);
    }


    /* ---------- Find existing user (by provider ID or email) ---------- */

    $fields = "user_id, first_name, last_name, email, $column AS provider_id,
               store_name, is_vendor, verification_status, account_status";

    if ($email) {
        $stmt = $conn->prepare("
            SELECT $fields FROM users
            WHERE $column = ? OR email = ?
            ORDER BY ($column = ?) DESC
            LIMIT 1
        ");
        $stmt->bind_param("sss", $providerId, $email, $providerId);
    } else {
        $stmt = $conn->prepare("SELECT $fields FROM users WHERE $column = ? LIMIT 1");
        $stmt->bind_param("s", $providerId);
    }

    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();


    /* ---------- Login only signs in / register only creates ---------- */

    if ($mode === "login" && !$user) {
        return $fail([
            "not_registered" => true,
            "message" => "No Punlaan account uses this $label account yet. Please sign up first."
        ]);
    }

    if ($mode === "register" && $user) {
        return $fail([
            "already_registered" => true,
            "message" => "An account with this email already exists. Please sign in instead."
        ]);
    }

    $created = false;

    if ($user) {

        /* ---------- Link the provider to an existing email account ---------- */

        if ($user["provider_id"] === null) {
            $link = $conn->prepare("UPDATE users SET $column = ? WHERE user_id = ?");
            $link->bind_param("si", $providerId, $user["user_id"]);
            $link->execute();
            $link->close();
        } elseif ($user["provider_id"] !== $providerId) {
            return $fail(["message" => "This email is linked to a different $label account."]);
        }

    } else {

        /* ---------- Create a new buyer account ---------- */
        // Social users get a random, unusable password. They sign in with
        // their provider, or set a real password later via "Forgot password".

        if (!$email) {
            return $fail(["message" => "Your $label account has no email address. Please sign up with email instead."]);
        }

        $storeName = null;
        $isVendor = 0;
        $verificationStatus = 0;
        $accountStatus = 0;
        $hashedPassword = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);

        $insert = $conn->prepare("
            INSERT INTO users
                (first_name, last_name, store_name, email, password, $column,
                 is_vendor, verification_status, account_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insert->bind_param(
            "ssssssiii",
            $firstName,
            $lastName,
            $storeName,
            $email,
            $hashedPassword,
            $providerId,
            $isVendor,
            $verificationStatus,
            $accountStatus
        );

        if (!$insert->execute()) {
            $insert->close();
            return $fail(["message" => "Could not create account."]);
        }

        $user = [
            "user_id" => $insert->insert_id,
            "first_name" => $firstName,
            "last_name" => $lastName,
            "email" => $email,
            "store_name" => $storeName,
            "is_vendor" => $isVendor,
            "verification_status" => $verificationStatus,
            "account_status" => $accountStatus
        ];
        $insert->close();
        $created = true;
    }


    /* ---------- Account status ---------- */

    if ((int)$user["account_status"] === 2) {
        return $fail(["message" => "Your account has been blocked. Please contact support."]);
    }

    if ((int)$user["account_status"] === 1) {
        return $fail(["message" => "Your account has been suspended."]);
    }

    if ((int)$user["is_vendor"] === 1 && (int)$user["verification_status"] === 1) {
        return $fail(["vendor_pending" => true, "message" => "Your vendor account is awaiting verification."]);
    }

    if ((int)$user["is_vendor"] === 1 && (int)$user["verification_status"] === 3) {
        return $fail(["message" => "Your vendor verification was rejected."]);
    }


    /* ---------- Record the login (the provider verified the email) ---------- */

    $update = $conn->prepare("UPDATE users SET last_login = NOW(), email_verified = 1 WHERE user_id = ?");
    $update->bind_param("i", $user["user_id"]);
    $update->execute();
    $update->close();

    return ["ok" => true, "user" => $user, "created" => $created];
}
