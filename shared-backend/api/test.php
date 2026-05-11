<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$result = [
    "step1_php" => "✅ PHP works",
    "step2_path" => __FILE__,
    "step3_db"   => null,
    "step4_tables" => null,
    "error" => null
];

try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=club_sportif;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $result["step3_db"] = "✅ MySQL connected";

    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $result["step4_tables"] = count($tables) > 0
        ? "✅ Tables found: " . implode(", ", $tables)
        : "❌ No tables — did you run schema.sql?";

} catch (PDOException $e) {
    $result["step3_db"] = "❌ DB Error: " . $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>