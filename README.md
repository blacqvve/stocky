# Stocky

Self-hosted inventory and project kitting system for electronics labs.

## Features

- **Inventory Explorer** — collapsible location tree with inline quantity adjustment
- **Rapid Ingest** — keyboard-driven part entry with Save & Duplicate workflow
- **KiCad BOM Analyzer** — drag-and-drop CSV upload with stock status and pick list generation
- **Dashboard** — stats overview and low-stock alerts

## Tech Stack

- **Backend:** Go 1.22, go-chi/chi, pgx/v5
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL 16 with JSONB attributes
- **Deployment:** Docker Compose

## Quick Start

### 1. Copy environment config

```bash
cp .env.example .env
```

Edit `.env` to set your credentials:
```
STOCKY_USER=admin
STOCKY_PASS=your-secure-password
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- PostgreSQL on port 5432
- Runs database migrations automatically
- Go API on port 8080
- Next.js frontend on port 3000

Open **http://localhost:3000**

### 3. Data persistence

By default, PostgreSQL data is stored in a named Docker volume (`postgres_data`).

To persist to a host directory (e.g. for backups), set in `.env`:
```
POSTGRES_DATA_PATH=/path/to/your/data
```

## Development

### Backend only

```bash
# Start just the database
make db

# Run migrations
make migrate

# Build and run API locally
cd backend
go run ./cmd/api
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### Database migrations

```bash
# Apply migrations
make migrate

# Roll back last migration
make migrate-down
```

## API Endpoints

Base URL: `http://localhost:8080/api/v1`

All routes require Basic Auth if `STOCKY_USER`/`STOCKY_PASS` are set.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/locations/tree` | Recursive location tree |
| GET/POST | `/locations` | List / create locations |
| PUT/DELETE | `/locations/{id}` | Update / delete location |
| GET/POST | `/components` | List / create components |
| PUT/DELETE | `/components/{id}` | Update / delete component |
| POST | `/components/batch` | Batch create with inventory |
| GET/POST | `/inventory` | Get by location / upsert |
| POST | `/inventory/adjust` | Add/subtract stock (delta) |
| GET/POST | `/projects` | List / create projects |
| GET | `/projects/{id}/bom` | Get project BOM |
| GET | `/categories` | List categories |
| GET | `/stats` | Dashboard stats |
| POST | `/bom/kicad/analyze` | Analyze KiCad CSV |

## Environment Variables

See `.env.example` for full documentation.
