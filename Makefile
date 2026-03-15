.PHONY: dev build tidy migrate migrate-down generate lint

DB_URL ?= postgres://stocky:stocky@localhost:5432/stocky?sslmode=disable

# Start all services in development mode
dev:
	docker compose up --build

# Start only the database
db:
	docker compose up db -d

# Run database migrations (requires running db)
migrate:
	docker run --rm \
		-v $(PWD)/backend/migrations:/migrations \
		--network host \
		migrate/migrate \
		-path=/migrations \
		-database "$(DB_URL)" up

# Roll back last migration
migrate-down:
	docker run --rm \
		-v $(PWD)/backend/migrations:/migrations \
		--network host \
		migrate/migrate \
		-path=/migrations \
		-database "$(DB_URL)" down 1

# Build Go backend
build:
	cd backend && go build ./...

# Tidy Go dependencies
tidy:
	cd backend && go mod tidy

# Run backend tests
test:
	cd backend && go test ./...

# Install frontend dependencies
install:
	cd frontend && yarn install

# Build frontend
build-frontend:
	cd frontend && yarn build

# Full production build
build-all: build build-frontend

# Clean Docker volumes (WARNING: destroys data)
clean:
	docker compose down -v
