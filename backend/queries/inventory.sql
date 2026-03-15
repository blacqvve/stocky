-- name: GetInventoryByLocation :many
SELECT i.*, c.name as component_name, c.mpn, c.attributes, cat.name as category_name
FROM inventory i
JOIN components c ON i.component_id = c.id
JOIN categories cat ON c.category_id = cat.id
WHERE i.location_id = $1
ORDER BY c.name;

-- name: GetInventoryByComponent :many
SELECT i.*, l.name as location_name, l.type as location_type
FROM inventory i
JOIN locations l ON i.location_id = l.id
WHERE i.component_id = $1;

-- name: UpsertInventory :one
INSERT INTO inventory (location_id, component_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (location_id, component_id) DO UPDATE
SET quantity = EXCLUDED.quantity, updated_at = NOW()
RETURNING *;

-- name: AdjustInventory :one
INSERT INTO inventory (location_id, component_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (location_id, component_id) DO UPDATE
SET quantity = GREATEST(0, inventory.quantity + EXCLUDED.quantity), updated_at = NOW()
RETURNING *;

-- name: DeleteInventory :exec
DELETE FROM inventory WHERE location_id = $1 AND component_id = $2;
