<?php

require_once __DIR__ . "/superadmin_auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "POST required."
    ]);

    exit;
}

$firstName = trim($_POST["first_name"] ?? "");
$lastName  = trim($_POST["last_name"] ?? "");
$email     = trim($_POST["email"] ?? "");
$password  = $_POST["password"] ?? "";

if (
    $firstName === "" ||
    $lastName === "" ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($password) < 8
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid account information."
    ]);

    exit;
}

$check = $conn->prepare("
    SELECT user_id
    FROM users
    WHERE email = ?
    LIMIT 1
");

$check->bind_param("s", $email);
$check->execute();

if ($check->get_result()->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "That email is already registered."
    ]);

    $check->close();
    exit;
}

$check->close();

$passwordHash = password_hash(
    $password,
    PASSWORD_DEFAULT
);

$stmt = $conn->prepare("
    INSERT INTO users (
        first_name,
        last_name,
        email,
        password,
        is_vendor,
        is_admin,
        is_superadmin,
        verification_status,
        account_status
    )
    VALUES (
        ?, ?, ?, ?, 0, 1, 0, 0, 0
    )
");

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare account creation."
    ]);

    exit;
}

$stmt->bind_param(
    "ssss",
    $firstName,
    $lastName,
    $email,
    $passwordHash
);

if (!$stmt->execute()) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to create admin account."
    ]);

    $stmt->close();
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Admin account created successfully.",
    "user_id" => (int)$stmt->insert_id
]);

$stmt->close();
$conn->close();