<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────────
if ($method === 'GET') {
    $search = $_GET['q'] ?? '';
    $sql = "SELECT m.*,
                   a.type_abonnement, a.date_debut, a.date_fin, a.statut AS abo_statut, a.montant
            FROM membres m
            LEFT JOIN abonnements a ON a.membre_id = m.id AND a.statut = 'actif'
            WHERE 1=1";
    $params = [];
    if ($search) {
        $sql .= " AND (m.nom LIKE ? OR m.email LIKE ? OR m.telephone LIKE ?)";
        $like = "%$search%";
        $params = [$like, $like, $like];
    }
    $sql .= " ORDER BY m.created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── POST (create) ────────────────────────────────────────────────
if ($method === 'POST') {
    $d = json_decode(file_get_contents("php://input"), true);

    if (empty($d['nom']) || empty($d['telephone'])) {
        echo json_encode(['success' => false, 'error' => 'Nom et téléphone requis']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            "INSERT INTO membres (nom, email, telephone, date_naissance)
             VALUES (?, ?, ?, ?)"
        )->execute([$d['nom'], $d['email'] ?? null, $d['telephone'], $d['date_naissance'] ?? null]);
        $membreId = $pdo->lastInsertId();

        if (!empty($d['type_abonnement'])) {
            $montants = [
                'Gym Mensuel'    => 180,  'Gym Trimestriel' => 450,
                'Gym Annuel'     => 1300, 'Coaching Privé'  => 300,
                'Coaching Groupe'=> 180,  'Accès Libre'     => 80,
                'Padel Séance'   => 30,   'Padel Pack 5'    => 120,
                'Basketball Mensuel' => 150,
            ];
            $montant = $montants[$d['type_abonnement']] ?? 0;
            $debut   = $d['date_debut'] ?? date('Y-m-d');
            $fin     = date('Y-m-d', strtotime($debut . ' +1 month'));

            $pdo->prepare(
                "INSERT INTO abonnements (membre_id, type_abonnement, montant, date_debut, date_fin)
                 VALUES (?, ?, ?, ?, ?)"
            )->execute([$membreId, $d['type_abonnement'], $montant, $debut, $fin]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'id' => $membreId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ── PUT (update) ─────────────────────────────────────────────────
if ($method === 'PUT') {
    $d = json_decode(file_get_contents("php://input"), true);
    $id = $d['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing id']); exit; }

    $pdo->prepare(
        "UPDATE membres SET nom=?, email=?, telephone=?, date_naissance=?, statut=? WHERE id=?"
    )->execute([
        $d['nom'], $d['email'] ?? null, $d['telephone'],
        $d['date_naissance'] ?? null, $d['statut'] ?? 'actif', $id
    ]);
    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $d = json_decode(file_get_contents("php://input"), true);
    $id = $d['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing id']); exit; }

    // CASCADE handles abonnements deletion (set in schema)
    $pdo->prepare("DELETE FROM membres WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['error' => 'Method not allowed']);