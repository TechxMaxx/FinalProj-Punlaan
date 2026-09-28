<?php

// Admins only
require_once __DIR__ . "/admin_auth.php";

header("Content-Type: application/json");

require 'connection.php';


$sql = "
SELECT
    user_id,
    CONCAT(first_name, ' ', last_name) AS name,
    email,

    CASE
        WHEN is_admin = 1 THEN 'Admin'
        WHEN is_vendor = 1 THEN 'Vendor'
        ELSE 'Customer'
    END AS type,

    created_at

FROM users

WHERE account_status = 2

ORDER BY created_at DESC
";


$result =
    $conn->query($sql);


$users = [];


while ($row = $result->fetch_assoc()) {

    $users[] = [

        "user_id" =>
            (int)$row["user_id"],

        "name" =>
            $row["name"],

        "email" =>
            $row["email"],

        "type" =>
            $row["type"],

        "blockedDate" =>
            date(
                "M d, Y",
                strtotime($row["created_at"])
            ),

        /*
         * These are still placeholder fields
         * because your current users table does not
         * have blocked-by / reason / appeals fields.
         */
        "reason" =>
            "Violation",

        "blockedBy" =>
            "Administrator",

        "appeals" =>
            0
    ];
}


echo json_encode($users);

?>