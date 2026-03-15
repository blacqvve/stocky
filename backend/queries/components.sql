-- name: GetComponent :one
SELECT c.*, cat.name as category_name
FROM components c
JOIN categories cat ON c.category_id = cat.id
WHERE c.id = $1;

-- name: ListComponents :many
SELECT c.*, cat.name as category_name,
    COALESCE(SUM(i.quantity), 0)::int as total_quantity
FROM components c
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN inventory i ON i.component_id = c.id
GROUP BY c.id, cat.name
ORDER BY c.name;

-- name: SearchComponents :many
SELECT c.*, cat.name as category_name,
    COALESCE(SUM(i.quantity), 0)::int as total_quantity
FROM components c
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN inventory i ON i.component_id = c.id
WHERE (sqlc.narg('search')::text IS NULL OR c.name ILIKE '%' || sqlc.narg('search')::text || '%')
  AND (sqlc.narg('category_id')::uuid IS NULL OR c.category_id = sqlc.narg('category_id')::uuid)
  AND (sqlc.narg('location_id')::uuid IS NULL OR i.location_id = sqlc.narg('location_id')::uuid)
GROUP BY c.id, cat.name
ORDER BY c.name;

-- name: CreateComponent :one
INSERT INTO components (mpn, name, category_id, attributes, datasheet_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateComponent :one
UPDATE components SET mpn = $2, name = $3, category_id = $4, attributes = $5, datasheet_url = $6, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteComponent :exec
DELETE FROM components WHERE id = $1;

-- name: FindComponentsByValueAndFootprint :many
SELECT c.*, cat.name as category_name,
    COALESCE(SUM(i.quantity), 0)::int as total_quantity
FROM components c
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN inventory i ON i.component_id = c.id
WHERE c.name ILIKE $1
  AND (c.attributes->>'footprint' ILIKE $2 OR $2 = '')
GROUP BY c.id, cat.name;
