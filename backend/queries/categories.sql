-- name: ListCategories :many
SELECT * FROM categories ORDER BY name;

-- name: GetCategory :one
SELECT * FROM categories WHERE id = $1;

-- name: CreateCategory :one
INSERT INTO categories (name) VALUES ($1) RETURNING *;
