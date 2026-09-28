<?php

session_start();

header("Content-Type: application/json");


/* =========================================================
   CHECK ADMIN SESSION
========================================================= */

if (
    !isset($_SESSION["admin_user_id"]) ||
    !isset($_SESSION["is_admin"]) ||
    (int)$_SESSION["is_admin"] !== 1
) {

    echo json_encode([]);

    exit;

}


require_once __DIR__ . "/../connection.php";


/* =========================================================
   LOAD BROADCAST HISTORY
========================================================= */

$sql = "

    SELECT

        n.notification_id,

        n.title,

        n.message,

        n.audience,

        n.priority,

        n.target_user_id,

        n.created_at,

        COUNT(
            nr.notification_recipient_id
        ) AS recipients,

        CONCAT(
            admin.first_name,
            ' ',
            admin.last_name
        ) AS sent_by_name,

        CONCAT(
            target.first_name,
            ' ',
            target.last_name
        ) AS target_user_name

    FROM notifications n

    LEFT JOIN notification_recipients nr
        ON nr.notification_id =
           n.notification_id

    LEFT JOIN users admin
        ON admin.user_id =
           n.sent_by_admin_id

    LEFT JOIN users target
        ON target.user_id =
           n.target_user_id

    -- Only messages sent by admins (not automatic order updates)
    WHERE n.kind = 'broadcast'

    GROUP BY

        n.notification_id,
        n.title,
        n.message,
        n.audience,
        n.priority,
        n.target_user_id,
        n.created_at,
        admin.first_name,
        admin.last_name,
        target.first_name,
        target.last_name

    ORDER BY
        n.created_at DESC

";


$stmt =
    $conn->prepare(
        $sql
    );


if (!$stmt) {

    echo json_encode([]);

    $conn->close();

    exit;

}


if (
    !$stmt->execute()
) {

    echo json_encode([]);

    $stmt->close();
    $conn->close();

    exit;

}


$result =
    $stmt->get_result();


$broadcasts = [];


while (
    $row =
    $result->fetch_assoc()
) {

    $sentBy =
        trim(
            $row["sent_by_name"] ?? ""
        );


    if (
        $sentBy === ""
    ) {

        $sentBy =
            "Administrator";

    }


    $targetUserName =
        trim(
            $row["target_user_name"] ?? ""
        );


    $broadcasts[] = [

        "notification_id" =>
            (int)$row["notification_id"],

        "title" =>
            $row["title"],

        "message" =>
            $row["message"],

        "audience" =>
            $row["audience"],

        "priority" =>
            $row["priority"],

        "targetUserId" =>
            $row["target_user_id"]
                !== null
                ? (int)$row["target_user_id"]
                : null,

        "targetUserName" =>
            $targetUserName,

        "recipients" =>
            (int)$row["recipients"],

        "sentBy" =>
            $sentBy,

        "sentAt" =>
            date(
                "M d, Y h:i A",
                strtotime(
                    $row["created_at"]
                )
            )

    ];

}


echo json_encode(
    $broadcasts
);


$stmt->close();
$conn->close();

?>