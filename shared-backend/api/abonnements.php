<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id'])     ? (int)$_GET['id'] : null;
$cat    = $_GET['categorie']     ?? null;

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {

    // ── GET : catalogue des abonnements ──────────────────────────
    if ($method === 'GET') {
        $sql    = "SELECT * FROM catalogue_abonnements";
        $params = [];
        if ($cat) {
            $sql     .= " WHERE categorie = ?";
            $params[] = $cat;
        }
        $sql .= " ORDER BY categorie, prix ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ── POST ─────────────────────────────────────────────────────
    if ($method === 'POST') {
        $d = json_decode(file_get_contents("php://input"), true);

        if (!$d) {
            jsonResponse(['success' => false, 'error' => 'Données JSON manquantes'], 400);
        }

        // ── CAS 1 : Souscription membre (depuis pricing.html) ────
        // Détecté si le champ "email" est présent
        if (!empty($d['email'])) {

            // Validation champs obligatoires
            foreach (['nom', 'email', 'categorie', 'duree', 'date_debut'] as $field) {
                if (empty($d[$field])) {
                    jsonResponse(['success' => false, 'error' => "Champ requis manquant : $field"], 400);
                }
            }

            // Bloquer les dates passées
            if ($d['date_debut'] < date('Y-m-d')) {
                jsonResponse(['success' => false, 'error' => 'La date de début ne peut pas être dans le passé.'], 400);
            }

            // 1. Récupérer ou créer le membre
            $stmt = $pdo->prepare("SELECT id FROM membres WHERE email = ?");
            $stmt->execute([$d['email']]);
            $membre = $stmt->fetch();

            if ($membre) {
                $membreId = $membre['id'];
                $pdo->prepare("UPDATE membres SET nom = ?, telephone = ? WHERE id = ?")
                    ->execute([$d['nom'], $d['telephone'] ?? null, $membreId]);
            } else {
                $pdo->prepare("INSERT INTO membres (nom, email, telephone) VALUES (?, ?, ?)")
                    ->execute([$d['nom'], $d['email'], $d['telephone'] ?? null]);
                $membreId = (int)$pdo->lastInsertId();
            }

            // 2. Calculer date_fin selon la durée
            $map     = ['1 mois' => 1, '3 mois' => 3, '6 mois' => 6, '1 an' => 12];
            $mois    = $map[$d['duree']] ?? 1;
            $dateFin = date('Y-m-d', strtotime($d['date_debut'] . " +{$mois} months"));

            // 3. Récupérer le montant
            $montant = isset($d['montant']) ? (float)$d['montant'] : 0;

            // 4. Insérer l'abonnement
            $pdo->prepare(
                "INSERT INTO abonnements (membre_id, type_abonnement, montant, date_debut, date_fin, statut)
                 VALUES (?, ?, ?, ?, ?, 'actif')"
            )->execute([$membreId, $d['categorie'], $montant, $d['date_debut'], $dateFin]);

            $aboId = (int)$pdo->lastInsertId();
            jsonResponse(['success' => true, 'id' => $aboId, 'membre_id' => $membreId]);
        }

        // ── CAS 2 : Création catalogue (depuis admin dashboard) ──
        if (empty($d['nom']) || empty($d['prix']) || empty($d['duree']) || empty($d['categorie'])) {
            jsonResponse(['success' => false, 'error' => 'Champs requis manquants (catalogue)'], 400);
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
        jsonResponse(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    // ── PUT : modifier un abonnement catalogue (admin) ───────────
    if ($method === 'PUT') {
        $d  = json_decode(file_get_contents("php://input"), true);
        $id = isset($d['id']) ? (int)$d['id'] : null;

        if (!$id) {
            jsonResponse(['success' => false, 'error' => 'ID manquant'], 400);
        }

        $pdo->prepare(
            "UPDATE catalogue_abonnements
             SET nom = ?, prix = ?, duree = ?, description = ?, pack10 = ?
             WHERE id = ?"
        )->execute([
            $d['nom'],
            (float)$d['prix'],
            $d['duree'],
            $d['description'] ?? null,
            isset($d['pack10']) && $d['pack10'] !== '' ? (float)$d['pack10'] : null,
            $id
        ]);
        jsonResponse(['success' => true]);
    }

    // ── DELETE : supprimer du catalogue (admin) ──────────────────
    if ($method === 'DELETE') {
        $d  = json_decode(file_get_contents("php://input"), true);
        $id = isset($d['id']) ? (int)$d['id'] : null;

        if (!$id) {
            jsonResponse(['success' => false, 'error' => 'ID manquant'], 400);
        }

        $pdo->prepare("DELETE FROM catalogue_abonnements WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonResponse(['success' => false, 'error' => 'Méthode non supportée'], 405);

} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Erreur base de données : ' . $e->getMessage()], 500);
}