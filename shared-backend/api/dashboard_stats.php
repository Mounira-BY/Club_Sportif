<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
require_once __DIR__ . '/../db.php';

$stats = [];

// ── 1. Stat cards ──────────────────────────────────────────────
$stats['membres_actifs'] = $pdo
    ->query("SELECT COUNT(*) FROM membres WHERE statut = 'actif'")
    ->fetchColumn();

$stats['revenus_mensuel'] = $pdo
    ->query("SELECT COALESCE(SUM(montant),0) FROM paiements
             WHERE MONTH(date_paiement)=MONTH(CURDATE())
               AND YEAR(date_paiement)=YEAR(CURDATE())")
    ->fetchColumn();

$stats['expirations_7j'] = $pdo
    ->query("SELECT COUNT(*) FROM abonnements
             WHERE statut='actif'
               AND date_fin BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)")
    ->fetchColumn();

// ── 2. Revenue chart – monthly totals for current year ─────────
$revChart = $pdo->query(
    "SELECT MONTH(date_paiement) AS mois, SUM(montant) AS total
     FROM paiements
     WHERE YEAR(date_paiement) = YEAR(CURDATE())
     GROUP BY mois ORDER BY mois"
)->fetchAll();

$monthlyData = array_fill(1, 12, 0);
foreach ($revChart as $row) $monthlyData[(int)$row['mois']] = (float)$row['total'];
$stats['revenus_chart'] = array_values($monthlyData);

// ── 3. Doughnut – subscription type counts ─────────────────────
$stats['repartition'] = $pdo
    ->query("SELECT type_abonnement, COUNT(*) AS total
             FROM abonnements WHERE statut='actif'
             GROUP BY type_abonnement")
    ->fetchAll();

// ── 4. Recent members (last 7 days) ────────────────────────────
$stats['nouveaux_membres'] = $pdo
    ->query("SELECT m.nom, a.type_abonnement, m.date_inscription, m.statut
             FROM membres m
             LEFT JOIN abonnements a ON a.membre_id = m.id AND a.statut='actif'
             WHERE m.date_inscription >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             ORDER BY m.created_at DESC LIMIT 10")
    ->fetchAll();

// ── 5. Today's reservations ────────────────────────────────────
$stats['reservations_today'] = $pdo
    ->query("SELECT r.heure_debut, r.activite, m.nom AS membre, r.salle
             FROM reservations r
             LEFT JOIN membres m ON m.id = r.membre_id
             WHERE r.date_reservation = CURDATE()
               AND r.statut = 'confirmee'
             ORDER BY r.heure_debut")
    ->fetchAll();

// ── 6. Subscription stats (for progress bars) ──────────────────
$stats['abo_stats'] = $pdo
    ->query("SELECT type_abonnement, COUNT(*) AS total
             FROM abonnements WHERE statut='actif'
             GROUP BY type_abonnement ORDER BY total DESC")
    ->fetchAll();

echo json_encode(['success' => true, 'data' => $stats]);
?>