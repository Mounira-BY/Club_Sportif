<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query(
                'SELECT r.id, r.membre_id, r.activite, r.salle, r.date_reservation, r.heure_debut, r.heure_fin, r.statut, r.created_at, m.nom AS membre_nom
                 FROM reservations r
                 LEFT JOIN membres m ON r.membre_id = m.id
                 ORDER BY r.date_reservation ASC, r.heure_debut ASC'
            );
            $reservations = $stmt->fetchAll();
            jsonResponse(['success' => true, 'data' => $reservations]);
            break;

        case 'POST':
            if (!$input) {
                jsonResponse(['success' => false, 'error' => 'Données JSON manquantes'], 400);
            }

            $activite = trim($input['activite'] ?? '');
            $date_reservation = trim($input['date_reservation'] ?? '');
            $heure_debut = trim($input['heure_debut'] ?? '');
            $statut = trim($input['statut'] ?? 'confirmee');

            if (!$activite || !$date_reservation || !$heure_debut) {
                jsonResponse(['success' => false, 'error' => 'Activité, date et heure de début sont obligatoires'], 400);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO reservations (membre_id, activite, salle, date_reservation, heure_debut, heure_fin, statut)
                 VALUES (:membre_id, :activite, :salle, :date_reservation, :heure_debut, :heure_fin, :statut)'
            );
            $stmt->execute([
                ':membre_id' => !empty($input['membre_id']) ? $input['membre_id'] : null,
                ':activite' => $activite,
                ':salle' => trim($input['salle'] ?? ''),
                ':date_reservation' => $date_reservation,
                ':heure_debut' => $heure_debut,
                ':heure_fin' => trim($input['heure_fin'] ?? ''),
                ':statut' => in_array($statut, ['confirmee','annulee','en_attente']) ? $statut : 'confirmee',
            ]);

            jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            if (!$input || empty($input['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID de réservation manquant'], 400);
            }

            $id = (int)$input['id'];
            $fields = [];
            $params = [':id' => $id];

            $allowed = ['membre_id', 'activite', 'salle', 'date_reservation', 'heure_debut', 'heure_fin', 'statut'];
            foreach ($allowed as $key) {
                if (array_key_exists($key, $input)) {
                    $fields[] = "$key = :$key";
                    $params[":$key"] = $input[$key] === '' ? null : $input[$key];
                }
            }

            if (empty($fields)) {
                jsonResponse(['success' => false, 'error' => 'Aucun champ à mettre à jour'], 400);
            }

            $query = 'UPDATE reservations SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                jsonResponse(['success' => false, 'error' => 'Réservation introuvable ou non modifiée'], 404);
            }

            jsonResponse(['success' => true]);
            break;

        case 'DELETE':
            if (!$input || empty($input['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID de réservation manquant'], 400);
            }
            $id = (int)$input['id'];
            $stmt = $pdo->prepare('DELETE FROM reservations WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($stmt->rowCount() === 0) {
                jsonResponse(['success' => false, 'error' => 'Réservation introuvable'], 404);
            }
            jsonResponse(['success' => true]);
            break;

        default:
            jsonResponse(['success' => false, 'error' => 'Méthode non supportée'], 405);
    }
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Erreur base de données : ' . $e->getMessage()], 500);
}
