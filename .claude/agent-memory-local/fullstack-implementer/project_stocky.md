---
name: Stocky Project Overview
description: Core architecture, stack decisions, and file conventions for the Stocky electronics lab inventory project
type: project
---

# Stocky Project

## What It Is
Self-hosted inventory and project kitting system for a home electronics lab.

## Stack
- Backend: Go 1.22, module `github.com/stocky/api`, go-chi/chi router, pgx/v5, golang-migrate, sqlc
- Frontend: Next.js 14.2.5 App Router, TypeScript strict, Tailwind CSS, shadcn/ui primitives
- Database: PostgreSQL 16
- Deployment: Docker Compose (3 services: db, api, frontend)

## Key File Locations
- `backend/cmd/api/main.go` — entrypoint
- `backend/internal/handlers/` — HTTP handlers per domain
- `backend/internal/db/` — hand-written db layer (sqlc NOT run; db.go, models.go, queries.go written manually)
- `backend/internal/models/` — shared domain models
- `backend/queries/` — sqlc source SQL, one file per domain
- `backend/migrations/` — golang-migrate files (`NNN_name.{up,down}.sql`)
- `backend/sqlc.yaml` — sqlc config with uuid/timestamptz/jsonb type overrides
- `frontend/src/app/` — Next.js App Router pages
- `frontend/src/components/ui/` — shadcn-style UI primitives
- `frontend/src/lib/api.ts` — `apiFetch<T>()` — all API calls go here, prefixes `/api/v1`
- `frontend/src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

## Domain SQL Files
locations, categories, components, inventory, projects, stats — all in `backend/queries/`

## sqlc Type Overrides
- uuid → github.com/google/uuid.UUID
- timestamptz → time.Time
- jsonb → encoding/json.RawMessage

## Dev Commands
- `make tidy` — go mod tidy
- `make generate` — sqlc generate
- `make migrate` — run migrations via Docker
- `make dev` — docker-compose up --build

## Phase Status
- Phase 0 (scaffolding): COMPLETE
- Phase 1 (Go backend core API): COMPLETE
- Phase 2+ (frontend UI): pending
