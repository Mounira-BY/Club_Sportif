<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────────
// Paramètres optionnels :
//   ?activite=padel|basketball   → filtre par sport
//   ?date=YYYY-MM-DD             → filtre par date (pour vérif conflits)
//   ?salle=padel1                → filtre par terrain
if ($method === 'GET') {
    $sql    = "SELECT r.*, m.nom AS membre_nom, m.email AS membre_email, m.telephone AS membre_telephone
               FROM reservations r
               LEFT JOIN membres m ON m.id = r.membre_id
               WHERE 1=1";
    $params = [];

    if (!empty($_GET['activite'])) {
        $sql     .= " AND r.activite = ?";
        $params[] = $_GET['activite'];
    }
    if (!empty($_GET['date'])) {
        $sql     .= " AND r.date_reservation = ?";
        $params[] = $_GET['date'];
    }
    if (!empty($_GET['salle'])) {
        $sql     .= " AND r.salle = ?";
        $params[] = $_GET['salle'];
    }

    $sql .= " ORDER BY r.date_reservation ASC, r.heure_debut ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── POST (créer une réservation) ─────────────────────────────────
if ($method === 'POST') {
    $d = json_decode(file_get_contents("php://input"), true);

    // Validation des champs obligatoires
    $required = ['nom', 'email', 'telephone', 'activite', 'salle', 'date_reservation', 'heure_debut'];
    foreach ($required as $field) {
        if (empty($d[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Champ requis manquant : $field"]);
            exit;
        }
    }

    // Bloquer les dates passées
    if ($d['date_reservation'] < date('Y-m-d')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La date de réservation ne peut pas être dans le passé.']);
        exit;
    }

    // ── Vérification conflit : même terrain + même date + même heure ──
    $conflict = $pdo->prepare(
        "SELECT id FROM reservations
         WHERE salle = ? AND date_reservation = ? AND heure_debut = ? AND statut = 'confirmee'"
    );
    $conflict->execute([$d['salle'], $d['date_reservation'], $d['heure_debut']]);
    if ($conflict->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Ce créneau est déjà réservé pour ce terrain.']);
        exit;
    }

    // ── Récupérer ou créer le membre ──────────────────────────────────
    $membre = $pdo->prepare("SELECT id FROM membres WHERE email = ?");
    $membre->execute([$d['email']]);
    $membreRow = $membre->fetch();

    if ($membreRow) {
        $membreId = $membreRow['id'];
        // Mettre à jour le téléphone si besoin
        $pdo->prepare("UPDATE membres SET telephone = ?, nom = ? WHERE id = ?")
            ->execute([$d['telephone'], $d['nom'], $membreId]);
    } else {
        // Créer un nouveau membre automatiquement
        $pdo->prepare(
            "INSERT INTO membres (nom, email, telephone) VALUES (?, ?, ?)"
        )->execute([$d['nom'], $d['email'], $d['telephone']]);
        $membreId = $pdo->lastInsertId();
    }

    // ── Calculer heure_fin (créneau d'1h) ───────────────────────────
    $heureFin = date('H:i:s', strtotime($d['heure_debut']) + 3600);

    // ── Insérer la réservation ────────────────────────────────────────
    $pdo->prepare(
        "INSERT INTO reservations (membre_id, activite, salle, date_reservation, heure_debut, heure_fin, statut)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmee')"
    )->execute([
        $membreId,
        $d['activite'],
        $d['salle'],
        $d['date_reservation'],
        $d['heure_debut'],
        $heureFin
    ]);

    $reservationId = $pdo->lastInsertId();
    echo json_encode(['success' => true, 'id' => (int)$reservationId, 'membre_id' => (int)$membreId]);
    exit;
}

// ── PUT (modifier le statut d'une réservation) ───────────────────
if ($method === 'PUT') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = isset($d['id']) ? (int)$d['id'] : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID manquant']);
        exit;
    }

    $statuts_valides = ['confirmee', 'annulee', 'en_attente'];
    $statut = $d['statut'] ?? 'confirmee';
    if (!in_array($statut, $statuts_valides)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Statut invalide']);
        exit;
    }

    $pdo->prepare("UPDATE reservations SET statut = ? WHERE id = ?")
        ->execute([$statut, $id]);

    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE (annuler une réservation) ─────────────────────────────
if ($method === 'DELETE') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = isset($d['id']) ? (int)$d['id'] : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID manquant']);
        exit;
    }

    // Annulation douce : on met le statut à "annulee" plutôt que supprimer
    $pdo->prepare("UPDATE reservations SET statut = 'annulee' WHERE id = ?")
        ->execute([$id]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);