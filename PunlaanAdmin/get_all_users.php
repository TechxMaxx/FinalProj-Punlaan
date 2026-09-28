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

    is_superadmin,
    created_at,
    account_status

FROM users

WHERE account_status IN (0, 1)

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

        // Admins: 1 = Super Admin, 0 = Moderator
        "is_superadmin" =>
            (int)$row["is_superadmin"],

        "joined" =>
            date(
                "M d, Y",
                strtotime($row["created_at"])
            ),

        /*
         * These are placeholders for now.
         * We can connect them to orders later.
         */
        "orders" => 0,

        "spent" => "₱0.00",

        "status" =>
            ((int)$row["account_status"] === 1)
                ? "Suspended"
                : "Active"
    ];
}


echo json_encode($users);

?>