-- name: ListProjects :many
SELECT * FROM projects ORDER BY created_at DESC;

-- name: GetProject :one
SELECT * FROM projects WHERE id = $1;

-- name: CreateProject :one
INSERT INTO projects (name, status) VALUES ($1, $2) RETURNING *;

-- name: UpdateProjectStatus :one
UPDATE projects SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: GetProjectBOM :many
SELECT pb.*, c.name as component_name, c.mpn, c.attributes, cat.name as category_name
FROM project_boms pb
JOIN components c ON pb.component_id = c.id
JOIN categories cat ON c.category_id = cat.id
WHERE pb.project_id = $1;

-- name: UpsertProjectBOM :one
INSERT INTO project_boms (project_id, component_id, required_qty, allocated_qty)
VALUES ($1, $2, $3, $4)
ON CONFLICT (project_id, component_id) DO UPDATE
SET required_qty = EXCLUDED.required_qty, allocated_qty = EXCLUDED.allocated_qty, updated_at = NOW()
RETURNING *;
