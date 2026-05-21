<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {

    // ── GET ──────────────────────────────────────────────────────
    if ($method === 'GET') {
        $sql    = "SELECT r.*, m.nom AS membre_nom, m.email AS membre_email, m.telephone AS membre_telephone
                   FROM reservations r
                   LEFT JOIN membres m ON m.id = r.membre_id
                   WHERE 1=1";
        $params = [];

        if (!empty($_GET['activite'])) { $sql .= " AND r.activite = ?"; $params[] = $_GET['activite']; }
        if (!empty($_GET['date']))     { $sql .= " AND r.date_reservation = ?"; $params[] = $_GET['date']; }
        if (!empty($_GET['salle']))    { $sql .= " AND r.salle = ?"; $params[] = $_GET['salle']; }

        $sql .= " ORDER BY r.date_reservation ASC, r.heure_debut ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ── POST ─────────────────────────────────────────────────────
    if ($method === 'POST') {
        $d = json_decode(file_get_contents("php://input"), true);

        $required = ['nom', 'email', 'telephone', 'activite', 'salle', 'date_reservation', 'heure_debut'];
        foreach ($required as $field) {
            if (empty($d[$field])) jsonResponse(['success' => false, 'error' => "Champ requis manquant : $field"], 400);
        }

        if ($d['date_reservation'] < date('Y-m-d')) {
            jsonResponse(['success' => false, 'error' => 'La date ne peut pas être dans le passé.'], 400);
        }

        // Vérif conflit
        $conflict = $pdo->prepare(
            "SELECT id FROM reservations WHERE salle = ? AND date_reservation = ? AND heure_debut = ? AND statut = 'confirmee'"
        );
        $conflict->execute([$d['salle'], $d['date_reservation'], $d['heure_debut']]);
        if ($conflict->fetch()) {
            jsonResponse(['success' => false, 'error' => 'Ce créneau est déjà réservé pour ce terrain.'], 409);
        }

        // Récupérer ou créer membre
        $membre = $pdo->prepare("SELECT id FROM membres WHERE email = ?");
        $membre->execute([$d['email']]);
        $membreRow = $membre->fetch();

        if ($membreRow) {
            $membreId = $membreRow['id'];
            $pdo->prepare("UPDATE membres SET telephone = ?, nom = ? WHERE id = ?")->execute([$d['telephone'], $d['nom'], $membreId]);
        } else {
            $pdo->prepare("INSERT INTO membres (nom, email, telephone) VALUES (?, ?, ?)")->execute([$d['nom'], $d['email'], $d['telephone']]);
            $membreId = $pdo->lastInsertId();
        }

        $heureFin = date('H:i:s', strtotime($d['heure_debut']) + 3600);

        $pdo->prepare(
            "INSERT INTO reservations (membre_id, activite, salle, date_reservation, heure_debut, heure_fin, statut)
             VALUES (?, ?, ?, ?, ?, ?, 'confirmee')"
        )->execute([$membreId, $d['activite'], $d['salle'], $d['date_reservation'], $d['heure_debut'], $heureFin]);

        jsonResponse(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'membre_id' => (int)$membreId]);
    }

    // ── PUT ──────────────────────────────────────────────────────
    if ($method === 'PUT') {
        $d = json_decode(file_get_contents("php://input"), true);
        if (empty($d['id'])) jsonResponse(['success' => false, 'error' => 'ID manquant'], 400);

        $id = (int)$d['id'];
        $fields = [];
        $params = [':id' => $id];

        $allowed = ['membre_id', 'activite', 'salle', 'date_reservation', 'heure_debut', 'heure_fin', 'statut'];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $d)) {
                $fields[] = "$key = :$key";
                $params[":$key"] = $d[$key] === '' ? null : $d[$key];
            }
        }

        if (empty($fields)) jsonResponse(['success' => false, 'error' => 'Aucun champ à mettre à jour'], 400);

        $pdo->prepare('UPDATE reservations SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        jsonResponse(['success' => true]);
    }

    // ── DELETE ───────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $d  = json_decode(file_get_contents("php://input"), true);
        if (empty($d['id'])) jsonResponse(['success' => false, 'error' => 'ID manquant'], 400);

        $pdo->prepare("UPDATE reservations SET statut = 'annulee' WHERE id = ?")->execute([(int)$d['id']]);
        jsonResponse(['success' => true]);
    }

    jsonResponse(['success' => false, 'error' => 'Méthode non supportée'], 405);

} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Erreur DB : ' . $e->getMessage()], 500);
}