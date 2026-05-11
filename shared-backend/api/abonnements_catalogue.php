<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id'])       ? (int)$_GET['id'] : null;
$cat    = $_GET['categorie']       ?? null;

// ── GET ──────────────────────────────────────────────────────────
if ($method === 'GET') {
    $sql    = "SELECT * FROM catalogue_abonnements";
    $params = [];
    if ($cat) {
        $sql    .= " WHERE categorie = ?";
        $params[] = $cat;
    }
    $sql .= " ORDER BY categorie, prix ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── POST (create) ────────────────────────────────────────────────
if ($method === 'POST') {
    $d = json_decode(file_get_contents("php://input"), true);

    if (empty($d['nom']) || empty($d['prix']) || empty($d['duree']) || empty($d['categorie'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
        exit;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO catalogue_abonnements (categorie, nom, prix, duree, description, pack10)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $d['categorie'],
        $d['nom'],
        (float)$d['prix'],
        $d['duree'],
        $d['description'] ?? null,
        isset($d['pack10']) && $d['pack10'] !== '' ? (float)$d['pack10'] : null
    ]);
    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
    exit;
}

// ── PUT (update) ─────────────────────────────────────────────────
if ($method === 'PUT') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = isset($d['id']) ? (int)$d['id'] : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID manquant']);
        exit;
    }

    $stmt = $pdo->prepare(
        "UPDATE catalogue_abonnements
         SET nom=?, prix=?, duree=?, description=?, pack10=?
         WHERE id=?"
    );
    $stmt->execute([
        $d['nom'],
        (float)$d['prix'],
        $d['duree'],
        $d['description'] ?? null,
        isset($d['pack10']) && $d['pack10'] !== '' ? (float)$d['pack10'] : null,
        $id
    ]);
    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = isset($d['id']) ? (int)$d['id'] : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID manquant']);
        exit;
    }

    $pdo->prepare("DELETE FROM catalogue_abonnements WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);