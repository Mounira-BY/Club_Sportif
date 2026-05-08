<?php
session_start();

require_once "db.php";

/* CHECK LOGIN */
function isLoggedIn() {
    return isset($_SESSION['user']);
}

/* CHECK ADMIN */
function isAdmin() {
    return isset($_SESSION['user']) &&
           $_SESSION['user']['role'] === 'ADMIN';
}

/* REQUIRE LOGIN */
function requireLogin() {
    if (!isLoggedIn()) {
        header("Location: /club-site/login.php");
        exit();
    }
}

/* REQUIRE ADMIN */
function requireAdmin() {
    if (!isAdmin()) {
        header("Location: /admin-dashboard/login.php");
        exit();
    }
}

/* LOGIN FUNCTION */
function login($email, $password) {
    global $pdo;

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);

    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user'] = $user;
        return true;
    }

    return false;
}

/* LOGOUT */
function logout() {
    session_destroy();
    header("Location: /club-site/login.php");
    exit();
}
?>