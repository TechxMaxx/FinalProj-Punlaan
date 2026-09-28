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

    echo json_encode([

        "success" => false,

        "logged_in" => false,

        "message" =>
            "Administrator login required."

    ]);

    exit;

}


require_once __DIR__ . "/../connection.php";


/* =========================================================
   READ REQUEST
========================================================= */

$data =
    json_decode(
        file_get_contents(
            "php://input"
        ),
        true
    );


$title =
    trim(
        $data["title"] ?? ""
    );


$message =
    trim(
        $data["message"] ?? ""
    );


$audience =
    trim(
        $data["audience"] ?? ""
    );


$priority =
    trim(
        $data["priority"] ?? "Info"
    );


$targetUserId =
    isset(
        $data["targetUserId"]
    )
        ? (int)$data["targetUserId"]
        : 0;


/* =========================================================
   VALIDATION
========================================================= */

$allowedAudiences = [

    "All",

    "Customers",

    "Vendors",

    "Specific"

];


$allowedPriorities = [

    "Info",

    "Promo",

    "Urgent"

];


if (
    $title === "" ||
    $message === ""
) {

    echo json_encode([

        "success" => false,

        "message" =>
            "Title and message are required."

    ]);

    exit;

}


if (
    mb_strlen($title) > 120
) {

    echo json_encode([

        "success" => false,

        "message" =>
            "Broadcast title cannot exceed 120 characters."

    ]);

    exit;

}


if (
    mb_strlen($message) > 500
) {

    echo json_encode([

        "success" => false,

        "message" =>
            "Broadcast message cannot exceed 500 characters."

    ]);

    exit;

}


if (
    !in_array(
        $audience,
        $allowedAudiences,
        true
    )
) {

    echo json_encode([

        "success" => false,

        "message" =>
            "Invalid audience."

    ]);

    exit;

}


if (
    !in_array(
        $priority,
        $allowedPriorities,
        true
    )
) {

    echo json_encode([

        "success" => false,

        "message" =>
            "Invalid priority."

    ]);

    exit;

}


if (
    $audience === "Specific" &&
    $targetUserId <= 0
) {

    echo json_encode([

        "success" => false,

        "message" =>
            "Please select a specific user."

    ]);

    exit;

}


/* =========================================================
   ADMIN ID
========================================================= */

$adminId =
    (int)$_SESSION["admin_user_id"];


/* =========================================================
   START TRANSACTION
========================================================= */

$conn->begin_transaction();


try {


    /* =====================================================
       VERIFY ADMIN AGAINST DATABASE
    ===================================================== */

    $adminStmt =
        $conn->prepare("

            SELECT
                user_id,
                is_admin,
                account_status

            FROM users

            WHERE user_id = ?

            LIMIT 1

        ");


    if (!$adminStmt) {

        throw new Exception(
            "Failed to verify administrator."
        );

    }


    $adminStmt->bind_param(
        "i",
        $adminId
    );


    $adminStmt->execute();


    $adminResult =
        $adminStmt->get_result();


    if (
        $adminResult->num_rows === 0
    ) {

        $adminStmt->close();

        throw new Exception(
            "Administrator account was not found."
        );

    }


    $admin =
        $adminResult->fetch_assoc();


    $adminStmt->close();


    if (
        (int)$admin["is_admin"] !== 1 ||
        (int)$admin["account_status"] !== 0
    ) {

        throw new Exception(
            "Administrator account is no longer active."
        );

    }


    /* =====================================================
       VERIFY SPECIFIC USER
    ===================================================== */

    if (
        $audience === "Specific"
    ) {

        $userStmt =
            $conn->prepare("

                SELECT
                    user_id,
                    account_status

                FROM users

                WHERE user_id = ?

                LIMIT 1

            ");


        if (!$userStmt) {

            throw new Exception(
                "Failed to verify target user."
            );

        }


        $userStmt->bind_param(
            "i",
            $targetUserId
        );


        $userStmt->execute();


        $userResult =
            $userStmt->get_result();


        if (
            $userResult->num_rows === 0
        ) {

            $userStmt->close();

            throw new Exception(
                "Selected user does not exist."
            );

        }


        $targetUser =
            $userResult->fetch_assoc();


        $userStmt->close();


        if (
            (int)$targetUser["account_status"] !== 0
        ) {

            throw new Exception(
                "Selected user account is not active."
            );

        }

    }


    /* =====================================================
       CREATE NOTIFICATION
    ===================================================== */

    $notificationStmt =
        $conn->prepare("

            INSERT INTO notifications
            (
                title,
                message,
                audience,
                priority,
                target_user_id,
                sent_by_admin_id
            )

            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )

        ");


    if (!$notificationStmt) {

        throw new Exception(
            "Failed to create notification."
        );

    }


    $notificationTarget =
        $audience === "Specific"
            ? $targetUserId
            : null;


    $notificationStmt->bind_param(
        "ssssii",
        $title,
        $message,
        $audience,
        $priority,
        $notificationTarget,
        $adminId
    );


    if (
        !$notificationStmt->execute()
    ) {

        $notificationStmt->close();

        throw new Exception(
            "Failed to save notification."
        );

    }


    $notificationId =
        $conn->insert_id;


    $notificationStmt->close();


    /* =====================================================
       CREATE RECIPIENTS
    ===================================================== */

    if (
        $audience === "Specific"
    ) {


        $recipientStmt =
            $conn->prepare("

                INSERT INTO notification_recipients
                (
                    notification_id,
                    user_id
                )

                SELECT
                    ?,
                    user_id

                FROM users

                WHERE
                    user_id = ?

                    AND account_status = 0

            ");


        if (!$recipientStmt) {

            throw new Exception(
                "Failed to create notification recipient."
            );

        }


        $recipientStmt->bind_param(
            "ii",
            $notificationId,
            $targetUserId
        );


    } elseif (
        $audience === "Customers"
    ) {


        $recipientStmt =
            $conn->prepare("

                INSERT INTO notification_recipients
                (
                    notification_id,
                    user_id
                )

                SELECT
                    ?,
                    user_id

                FROM users

                WHERE
                    account_status = 0

                    AND is_vendor = 0

            ");


        if (!$recipientStmt) {

            throw new Exception(
                "Failed to create customer recipients."
            );

        }


        $recipientStmt->bind_param(
            "i",
            $notificationId
        );


    } elseif (
        $audience === "Vendors"
    ) {


        $recipientStmt =
            $conn->prepare("

                INSERT INTO notification_recipients
                (
                    notification_id,
                    user_id
                )

                SELECT
                    ?,
                    user_id

                FROM users

                WHERE
                    account_status = 0

                    AND is_vendor = 1

            ");


        if (!$recipientStmt) {

            throw new Exception(
                "Failed to create vendor recipients."
            );

        }


        $recipientStmt->bind_param(
            "i",
            $notificationId
        );


    } else {


        /* All active users */

        $recipientStmt =
            $conn->prepare("

                INSERT INTO notification_recipients
                (
                    notification_id,
                    user_id
                )

                SELECT
                    ?,
                    user_id

                FROM users

                WHERE
                    account_status = 0

            ");


        if (!$recipientStmt) {

            throw new Exception(
                "Failed to create recipients."
            );

        }


        $recipientStmt->bind_param(
            "i",
            $notificationId
        );

    }


    if (
        !$recipientStmt->execute()
    ) {

        $recipientStmt->close();

        throw new Exception(
            "Failed to assign notification recipients."
        );

    }


    $recipientCount =
        $recipientStmt->affected_rows;


    $recipientStmt->close();


    /* =====================================================
       MAKE SURE AT LEAST ONE USER RECEIVED IT
    ===================================================== */

    if (
        $recipientCount <= 0
    ) {

        throw new Exception(
            "No active users matched the selected audience."
        );

    }


    /* =====================================================
       COMMIT
    ===================================================== */

    $conn->commit();


    echo json_encode([

        "success" => true,

        "logged_in" => true,

        "notification_id" =>
            (int)$notificationId,

        "recipients" =>
            (int)$recipientCount,

        "message" =>
            "Broadcast sent successfully to " .
            $recipientCount .
            " user" .
            (
                $recipientCount === 1
                    ? ""
                    : "s"
            ) .
            "."

    ]);


} catch (
    Throwable $error
) {

    $conn->rollback();


    error_log(
        "Notification broadcast error: " .
        $error->getMessage()
    );


    echo json_encode([

        "success" => false,

        "logged_in" => true,

        "message" =>
            $error->getMessage()

    ]);

}


$conn->close();

?>