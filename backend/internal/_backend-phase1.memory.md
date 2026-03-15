# Backend Phase 1 — Implementation Notes

## What Was Built
Full Go backend: db layer, all domain handlers, middleware, and wired-up main.go.

## Key Decisions
- `internal/db/` is hand-written (no sqlc generate run) — pgxRow interface allows sharing `scanComponentWithCategory` across QueryRow and Rows.
- `SearchComponents` builds WHERE clauses dynamically with positional `$N` args; argIdx is incremented per clause.
- `ComponentWithCategory` embeds `Component` and adds `CategoryName` + `TotalQuantity` (aggregated via LEFT JOIN inventory).
- `InventoryWithComponent` and `InventoryWithLocation` are join-result types used only in read paths.
- Auth middleware skips entirely when `STOCKY_USER`/`STOCKY_PASS` env vars are unset — safe for local dev.
- `BatchCreate` (POST /components/batch) creates component + upserts inventory in a loop; no transaction wrapping (acceptable for MVP).

## Route Layout (`/api/v1/...`)
- `GET /locations/tree` — recursive CTE, returns nested `LocationNode` (children inline)
- `GET /components?search=&category_id=&location_id=` — unified search endpoint
- `POST /components/batch` — bulk import with inventory seeding
- `POST /inventory/adjust` — delta-based adjustment (GREATEST(0, qty + delta))
- `POST /bom/kicad/analyze` — multipart CSV upload → stock analysis per line
- `POST /bom/picklist` — placeholder, returns empty location map

## Extension Points
- Add transactions to BatchCreate by accepting `pgx.Tx` via DBTX interface.
- PickList handler (`bom.go`) is a stub — implement location-grouped pick routing there.
- Add `DeleteProjectBOM` and `UpdateProjectBOM` queries following the existing pattern in queries.go.
