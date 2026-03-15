package db

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// pgxRow is a local interface for scan-compatible rows (pgx.Row and pgx.Rows both satisfy it).
type pgxRow interface {
	Scan(dest ...interface{}) error
}

// ==================== LOCATIONS ====================

const getLocationTreeSQL = `
WITH RECURSIVE location_tree AS (
    SELECT id, parent_id, name, type, created_at, updated_at
    FROM locations
    WHERE parent_id IS NULL
    UNION ALL
    SELECT l.id, l.parent_id, l.name, l.type, l.created_at, l.updated_at
    FROM locations l
    INNER JOIN location_tree lt ON lt.id = l.parent_id
)
SELECT * FROM location_tree`

func (q *Queries) GetLocationTree(ctx context.Context) ([]Location, error) {
	rows, err := q.db.Query(ctx, getLocationTreeSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Location
	for rows.Next() {
		var i Location
		if err := rows.Scan(&i.ID, &i.ParentID, &i.Name, &i.Type, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func (q *Queries) GetLocation(ctx context.Context, id uuid.UUID) (Location, error) {
	row := q.db.QueryRow(ctx, `SELECT id, parent_id, name, type, created_at, updated_at FROM locations WHERE id = $1`, id)
	var i Location
	err := row.Scan(&i.ID, &i.ParentID, &i.Name, &i.Type, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) ListLocations(ctx context.Context) ([]Location, error) {
	rows, err := q.db.Query(ctx, `SELECT id, parent_id, name, type, created_at, updated_at FROM locations ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Location
	for rows.Next() {
		var i Location
		if err := rows.Scan(&i.ID, &i.ParentID, &i.Name, &i.Type, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

type CreateLocationParams struct {
	ParentID *uuid.UUID
	Name     string
	Type     string
}

func (q *Queries) CreateLocation(ctx context.Context, arg CreateLocationParams) (Location, error) {
	row := q.db.QueryRow(ctx,
		`INSERT INTO locations (parent_id, name, type) VALUES ($1, $2, $3) RETURNING id, parent_id, name, type, created_at, updated_at`,
		arg.ParentID, arg.Name, arg.Type,
	)
	var i Location
	err := row.Scan(&i.ID, &i.ParentID, &i.Name, &i.Type, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

type UpdateLocationParams struct {
	ID       uuid.UUID
	Name     string
	Type     string
	ParentID *uuid.UUID
}

func (q *Queries) UpdateLocation(ctx context.Context, arg UpdateLocationParams) (Location, error) {
	row := q.db.QueryRow(ctx,
		`UPDATE locations SET name = $2, type = $3, parent_id = $4, updated_at = NOW() WHERE id = $1 RETURNING id, parent_id, name, type, created_at, updated_at`,
		arg.ID, arg.Name, arg.Type, arg.ParentID,
	)
	var i Location
	err := row.Scan(&i.ID, &i.ParentID, &i.Name, &i.Type, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) DeleteLocation(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, `DELETE FROM locations WHERE id = $1`, id)
	return err
}

// ==================== CATEGORIES ====================

func (q *Queries) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := q.db.Query(ctx, `SELECT id, name, created_at, updated_at FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Category
	for rows.Next() {
		var i Category
		if err := rows.Scan(&i.ID, &i.Name, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func (q *Queries) GetCategory(ctx context.Context, id uuid.UUID) (Category, error) {
	row := q.db.QueryRow(ctx, `SELECT id, name, created_at, updated_at FROM categories WHERE id = $1`, id)
	var i Category
	err := row.Scan(&i.ID, &i.Name, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) CreateCategory(ctx context.Context, name string) (Category, error) {
	row := q.db.QueryRow(ctx, `INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at, updated_at`, name)
	var i Category
	err := row.Scan(&i.ID, &i.Name, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

// ==================== COMPONENTS ====================

const componentSelectSQL = `
SELECT c.id, c.mpn, c.name, c.category_id, c.attributes, c.datasheet_url, c.created_at, c.updated_at,
    cat.name AS category_name,
    COALESCE(SUM(i.quantity), 0)::int AS total_quantity
FROM components c
JOIN categories cat ON c.category_id = cat.id
LEFT JOIN inventory i ON i.component_id = c.id`

func scanComponentWithCategory(row pgxRow) (ComponentWithCategory, error) {
	var item ComponentWithCategory
	var attrs []byte
	err := row.Scan(
		&item.ID, &item.Mpn, &item.Name, &item.CategoryID, &attrs, &item.DatasheetUrl,
		&item.CreatedAt, &item.UpdatedAt, &item.CategoryName, &item.TotalQuantity,
	)
	if err != nil {
		return item, err
	}
	item.Attributes = json.RawMessage(attrs)
	return item, nil
}

func (q *Queries) GetComponent(ctx context.Context, id uuid.UUID) (ComponentWithCategory, error) {
	row := q.db.QueryRow(ctx, componentSelectSQL+` WHERE c.id = $1 GROUP BY c.id, cat.name`, id)
	return scanComponentWithCategory(row)
}

func (q *Queries) ListComponents(ctx context.Context) ([]ComponentWithCategory, error) {
	rows, err := q.db.Query(ctx, componentSelectSQL+` GROUP BY c.id, cat.name ORDER BY c.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ComponentWithCategory
	for rows.Next() {
		item, err := scanComponentWithCategory(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type SearchComponentsParams struct {
	Search     *string
	CategoryID *uuid.UUID
	LocationID *uuid.UUID
}

func (q *Queries) SearchComponents(ctx context.Context, arg SearchComponentsParams) ([]ComponentWithCategory, error) {
	query := componentSelectSQL
	args := []interface{}{}
	argIdx := 1
	var whereClauses []string

	if arg.Search != nil && *arg.Search != "" {
		whereClauses = append(whereClauses, `c.name ILIKE $`+strconv.Itoa(argIdx))
		args = append(args, "%"+*arg.Search+"%")
		argIdx++
	}
	if arg.CategoryID != nil {
		whereClauses = append(whereClauses, `c.category_id = $`+strconv.Itoa(argIdx))
		args = append(args, *arg.CategoryID)
		argIdx++
	}
	if arg.LocationID != nil {
		whereClauses = append(whereClauses, `i.location_id = $`+strconv.Itoa(argIdx))
		args = append(args, *arg.LocationID)
		argIdx++
	}
	_ = argIdx

	if len(whereClauses) > 0 {
		query += ` WHERE ` + strings.Join(whereClauses, " AND ")
	}
	query += ` GROUP BY c.id, cat.name ORDER BY c.name`

	rows, err := q.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ComponentWithCategory
	for rows.Next() {
		item, err := scanComponentWithCategory(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type CreateComponentParams struct {
	Mpn          *string
	Name         string
	CategoryID   uuid.UUID
	Attributes   json.RawMessage
	DatasheetUrl *string
}

func (q *Queries) CreateComponent(ctx context.Context, arg CreateComponentParams) (Component, error) {
	row := q.db.QueryRow(ctx,
		`INSERT INTO components (mpn, name, category_id, attributes, datasheet_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, mpn, name, category_id, attributes, datasheet_url, created_at, updated_at`,
		arg.Mpn, arg.Name, arg.CategoryID, []byte(arg.Attributes), arg.DatasheetUrl,
	)
	var i Component
	var attrs []byte
	if err := row.Scan(&i.ID, &i.Mpn, &i.Name, &i.CategoryID, &attrs, &i.DatasheetUrl, &i.CreatedAt, &i.UpdatedAt); err != nil {
		return i, err
	}
	i.Attributes = json.RawMessage(attrs)
	return i, nil
}

type UpdateComponentParams struct {
	ID           uuid.UUID
	Mpn          *string
	Name         string
	CategoryID   uuid.UUID
	Attributes   json.RawMessage
	DatasheetUrl *string
}

func (q *Queries) UpdateComponent(ctx context.Context, arg UpdateComponentParams) (Component, error) {
	row := q.db.QueryRow(ctx,
		`UPDATE components SET mpn=$2, name=$3, category_id=$4, attributes=$5, datasheet_url=$6, updated_at=NOW() WHERE id=$1 RETURNING id, mpn, name, category_id, attributes, datasheet_url, created_at, updated_at`,
		arg.ID, arg.Mpn, arg.Name, arg.CategoryID, []byte(arg.Attributes), arg.DatasheetUrl,
	)
	var i Component
	var attrs []byte
	if err := row.Scan(&i.ID, &i.Mpn, &i.Name, &i.CategoryID, &attrs, &i.DatasheetUrl, &i.CreatedAt, &i.UpdatedAt); err != nil {
		return i, err
	}
	i.Attributes = json.RawMessage(attrs)
	return i, nil
}

func (q *Queries) DeleteComponent(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, `DELETE FROM components WHERE id = $1`, id)
	return err
}

func (q *Queries) FindComponentsByValueAndFootprint(ctx context.Context, value, footprint string) ([]ComponentWithCategory, error) {
	rows, err := q.db.Query(ctx,
		componentSelectSQL+` WHERE c.name ILIKE $1 AND (c.attributes->>'footprint' ILIKE $2 OR $2 = '') GROUP BY c.id, cat.name`,
		value, footprint,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ComponentWithCategory
	for rows.Next() {
		item, err := scanComponentWithCategory(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// ==================== INVENTORY ====================

func (q *Queries) GetInventoryByLocation(ctx context.Context, locationID uuid.UUID) ([]InventoryWithComponent, error) {
	rows, err := q.db.Query(ctx, `
		SELECT i.location_id, i.component_id, i.quantity, i.created_at, i.updated_at,
			c.name AS component_name, c.mpn, c.attributes, cat.name AS category_name
		FROM inventory i
		JOIN components c ON i.component_id = c.id
		JOIN categories cat ON c.category_id = cat.id
		WHERE i.location_id = $1
		ORDER BY c.name`, locationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []InventoryWithComponent
	for rows.Next() {
		var i InventoryWithComponent
		var attrs []byte
		if err := rows.Scan(
			&i.LocationID, &i.ComponentID, &i.Quantity, &i.CreatedAt, &i.UpdatedAt,
			&i.ComponentName, &i.Mpn, &attrs, &i.CategoryName,
		); err != nil {
			return nil, err
		}
		i.Attributes = json.RawMessage(attrs)
		items = append(items, i)
	}
	return items, rows.Err()
}

func (q *Queries) GetInventoryByComponent(ctx context.Context, componentID uuid.UUID) ([]InventoryWithLocation, error) {
	rows, err := q.db.Query(ctx, `
		SELECT i.location_id, i.component_id, i.quantity, i.created_at, i.updated_at,
			l.name AS location_name, l.type AS location_type
		FROM inventory i
		JOIN locations l ON i.location_id = l.id
		WHERE i.component_id = $1`, componentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []InventoryWithLocation
	for rows.Next() {
		var i InventoryWithLocation
		if err := rows.Scan(
			&i.LocationID, &i.ComponentID, &i.Quantity, &i.CreatedAt, &i.UpdatedAt,
			&i.LocationName, &i.LocationType,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

type UpsertInventoryParams struct {
	LocationID  uuid.UUID
	ComponentID uuid.UUID
	Quantity    int32
}

func (q *Queries) UpsertInventory(ctx context.Context, arg UpsertInventoryParams) (Inventory, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO inventory (location_id, component_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (location_id, component_id) DO UPDATE
		SET quantity = EXCLUDED.quantity, updated_at = NOW()
		RETURNING location_id, component_id, quantity, created_at, updated_at`,
		arg.LocationID, arg.ComponentID, arg.Quantity,
	)
	var i Inventory
	err := row.Scan(&i.LocationID, &i.ComponentID, &i.Quantity, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) AdjustInventory(ctx context.Context, arg UpsertInventoryParams) (Inventory, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO inventory (location_id, component_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (location_id, component_id) DO UPDATE
		SET quantity = GREATEST(0, inventory.quantity + EXCLUDED.quantity), updated_at = NOW()
		RETURNING location_id, component_id, quantity, created_at, updated_at`,
		arg.LocationID, arg.ComponentID, arg.Quantity,
	)
	var i Inventory
	err := row.Scan(&i.LocationID, &i.ComponentID, &i.Quantity, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) DeleteInventory(ctx context.Context, locationID, componentID uuid.UUID) error {
	_, err := q.db.Exec(ctx, `DELETE FROM inventory WHERE location_id = $1 AND component_id = $2`, locationID, componentID)
	return err
}

// ==================== PROJECTS ====================

func (q *Queries) ListProjects(ctx context.Context) ([]Project, error) {
	rows, err := q.db.Query(ctx, `SELECT id, name, status, created_at, updated_at FROM projects ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Project
	for rows.Next() {
		var i Project
		if err := rows.Scan(&i.ID, &i.Name, &i.Status, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func (q *Queries) GetProject(ctx context.Context, id uuid.UUID) (Project, error) {
	row := q.db.QueryRow(ctx, `SELECT id, name, status, created_at, updated_at FROM projects WHERE id = $1`, id)
	var i Project
	err := row.Scan(&i.ID, &i.Name, &i.Status, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

type CreateProjectParams struct {
	Name   string
	Status string
}

func (q *Queries) CreateProject(ctx context.Context, arg CreateProjectParams) (Project, error) {
	row := q.db.QueryRow(ctx,
		`INSERT INTO projects (name, status) VALUES ($1, $2) RETURNING id, name, status, created_at, updated_at`,
		arg.Name, arg.Status,
	)
	var i Project
	err := row.Scan(&i.ID, &i.Name, &i.Status, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) UpdateProjectStatus(ctx context.Context, id uuid.UUID, status string) (Project, error) {
	row := q.db.QueryRow(ctx,
		`UPDATE projects SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id, name, status, created_at, updated_at`,
		id, status,
	)
	var i Project
	err := row.Scan(&i.ID, &i.Name, &i.Status, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

func (q *Queries) GetProjectBOM(ctx context.Context, projectID uuid.UUID) ([]ProjectBomWithComponent, error) {
	rows, err := q.db.Query(ctx, `
		SELECT pb.project_id, pb.component_id, pb.required_qty, pb.allocated_qty, pb.created_at, pb.updated_at,
			c.name AS component_name, c.mpn, c.attributes, cat.name AS category_name
		FROM project_boms pb
		JOIN components c ON pb.component_id = c.id
		JOIN categories cat ON c.category_id = cat.id
		WHERE pb.project_id = $1`, projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ProjectBomWithComponent
	for rows.Next() {
		var i ProjectBomWithComponent
		var attrs []byte
		if err := rows.Scan(
			&i.ProjectID, &i.ComponentID, &i.RequiredQty, &i.AllocatedQty, &i.CreatedAt, &i.UpdatedAt,
			&i.ComponentName, &i.Mpn, &attrs, &i.CategoryName,
		); err != nil {
			return nil, err
		}
		i.Attributes = json.RawMessage(attrs)
		items = append(items, i)
	}
	return items, rows.Err()
}

type UpsertProjectBOMParams struct {
	ProjectID    uuid.UUID
	ComponentID  uuid.UUID
	RequiredQty  int32
	AllocatedQty int32
}

func (q *Queries) UpsertProjectBOM(ctx context.Context, arg UpsertProjectBOMParams) (ProjectBom, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO project_boms (project_id, component_id, required_qty, allocated_qty)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (project_id, component_id) DO UPDATE
		SET required_qty = EXCLUDED.required_qty, allocated_qty = EXCLUDED.allocated_qty, updated_at = NOW()
		RETURNING project_id, component_id, required_qty, allocated_qty, created_at, updated_at`,
		arg.ProjectID, arg.ComponentID, arg.RequiredQty, arg.AllocatedQty,
	)
	var i ProjectBom
	err := row.Scan(&i.ProjectID, &i.ComponentID, &i.RequiredQty, &i.AllocatedQty, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

// ==================== STATS ====================

func (q *Queries) GetStats(ctx context.Context) (Stats, error) {
	row := q.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM components)::int AS total_components,
			(SELECT COUNT(DISTINCT component_id) FROM inventory WHERE quantity > 0)::int AS total_unique_parts,
			(SELECT COUNT(*) FROM projects WHERE status = 'active')::int AS active_projects,
			(SELECT COUNT(*) FROM inventory WHERE quantity <= 5 AND quantity > 0)::int AS low_stock_count`,
	)
	var s Stats
	err := row.Scan(&s.TotalComponents, &s.TotalUniqueParts, &s.ActiveProjects, &s.LowStockCount)
	return s, err
}
