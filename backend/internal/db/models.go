package db

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Location struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	ParentID  *uuid.UUID `json:"parent_id" db:"parent_id"`
	Name      string     `json:"name" db:"name"`
	Type      string     `json:"type" db:"type"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

type Category struct {
	ID        uuid.UUID       `json:"id" db:"id"`
	Name      string          `json:"name" db:"name"`
	Schema    json.RawMessage `json:"schema" db:"schema"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
}

type Component struct {
	ID           uuid.UUID       `json:"id" db:"id"`
	Mpn          *string         `json:"mpn" db:"mpn"`
	Name         string          `json:"name" db:"name"`
	CategoryID   uuid.UUID       `json:"category_id" db:"category_id"`
	Attributes   json.RawMessage `json:"attributes" db:"attributes"`
	DatasheetUrl *string         `json:"datasheet_url" db:"datasheet_url"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

type Inventory struct {
	LocationID  uuid.UUID `json:"location_id" db:"location_id"`
	ComponentID uuid.UUID `json:"component_id" db:"component_id"`
	Quantity    int32     `json:"quantity" db:"quantity"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Project struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type ProjectBom struct {
	ProjectID    uuid.UUID `json:"project_id" db:"project_id"`
	ComponentID  uuid.UUID `json:"component_id" db:"component_id"`
	RequiredQty  int32     `json:"required_qty" db:"required_qty"`
	AllocatedQty int32     `json:"allocated_qty" db:"allocated_qty"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// Extended types returned by joins

type ComponentWithCategory struct {
	Component
	CategoryName  string `json:"category_name" db:"category_name"`
	TotalQuantity int32  `json:"total_quantity" db:"total_quantity"`
}

type InventoryWithComponent struct {
	Inventory
	ComponentName string          `json:"component_name" db:"component_name"`
	Mpn           *string         `json:"mpn" db:"mpn"`
	Attributes    json.RawMessage `json:"attributes" db:"attributes"`
	CategoryName  string          `json:"category_name" db:"category_name"`
}

type InventoryWithLocation struct {
	Inventory
	LocationName string `json:"location_name" db:"location_name"`
	LocationType string `json:"location_type" db:"location_type"`
}

type ProjectBomWithComponent struct {
	ProjectBom
	ComponentName string          `json:"component_name" db:"component_name"`
	Mpn           *string         `json:"mpn" db:"mpn"`
	Attributes    json.RawMessage `json:"attributes" db:"attributes"`
	CategoryName  string          `json:"category_name" db:"category_name"`
}

type Stats struct {
	TotalComponents  int32 `json:"total_components" db:"total_components"`
	TotalUniqueParts int32 `json:"total_unique_parts" db:"total_unique_parts"`
	ActiveProjects   int32 `json:"active_projects" db:"active_projects"`
	LowStockCount    int32 `json:"low_stock_count" db:"low_stock_count"`
}
