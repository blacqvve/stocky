-- name: GetStats :one
SELECT
    (SELECT COUNT(*) FROM components)::int as total_components,
    (SELECT COUNT(DISTINCT component_id) FROM inventory WHERE quantity > 0)::int as total_unique_parts,
    (SELECT COUNT(*) FROM projects WHERE status = 'active')::int as active_projects,
    (SELECT COUNT(*) FROM inventory WHERE quantity <= 5 AND quantity > 0)::int as low_stock_count;
