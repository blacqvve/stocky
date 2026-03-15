-- name: GetLocationTree :many
WITH RECURSIVE location_tree AS (
    SELECT id, parent_id, name, type, created_at, updated_at
    FROM locations
    WHERE parent_id IS NULL
    UNION ALL
    SELECT l.id, l.parent_id, l.name, l.type, l.created_at, l.updated_at
    FROM locations l
    INNER JOIN location_tree lt ON lt.id = l.parent_id
)
SELECT * FROM location_tree;

-- name: GetLocation :one
SELECT * FROM locations WHERE id = $1;

-- name: ListLocations :many
SELECT * FROM locations ORDER BY name;

-- name: CreateLocation :one
INSERT INTO locations (parent_id, name, type)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateLocation :one
UPDATE locations SET name = $2, type = $3, parent_id = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteLocation :exec
DELETE FROM locations WHERE id = $1;
