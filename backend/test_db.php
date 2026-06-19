<?php
try {
    $pdo = new PDO('pgsql:host=localhost;port=5433;dbname=mytime2cloud_dev', 'postgres', 'sabari12345');
    echo "Connected!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
