# Phase 0 — Project Scaffolding & Infrastructure

## What Was Built
Complete project skeleton for Stocky: a self-hosted electronics lab inventory system.

## Stack
- Backend: Go 1.22, go-chi/chi, pgx/v5, golang-migrate, sqlc — module `github.com/stocky/api`
- Frontend: Next.js 14.2.5 (App Router), TypeScript strict, Tailwind CSS + shadcn/ui primitives
- DB: PostgreSQL 16
- Infra: Docker Compose (3 services: db, api, frontend)

## Key Structural Decisions
- `backend/internal/db/` — sqlc-generated code will land here (do not manually edit)
- `backend/queries/` — source SQL for sqlc; one file per domain (locations, categories, components, inventory, projects, stats)
- `backend/migrations/` — golang-migrate files; naming: `NNN_description.{up,down}.sql`
- Frontend: `src/app/` (App Router), `src/components/ui/` (shadcn primitives), `src/lib/` (utils + api client)

## sqlc Type Overrides
- `uuid` → `github.com/google/uuid.UUID`
- `timestamptz` → `time.Time`
- `jsonb` → `encoding/json.RawMessage`

## API Client Convention
`src/lib/api.ts` — `apiFetch<T>(path, options)` prefixes all paths with `${API_BASE}/api/v1`. All future API calls should go through this function.

## Extension Points
- New migrations: add `NNN_name.{up,down}.sql` in `backend/migrations/`
- New query domains: add SQL file in `backend/queries/`, run `make generate`
- New UI primitives: add to `frontend/src/components/ui/` following shadcn pattern
- New API route groups: implement handler in `backend/internal/handlers/`, wire in main.go

## Next Steps (Phase 1+)
- Run `make tidy` inside backend to populate go.sum
- Run `npm install` inside frontend to install node_modules
- Implement chi router, DB connection pool, and migration runner in main.go
- Implement handler layer per domain
