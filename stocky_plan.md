Here is the complete, consolidated Master Plan. It combines the architecture, database schemas, API contracts, UI behaviors, and implementation phases into a single, comprehensive document.

You can save this as a `gridstock-plan.md` file in your project root. It is formatted specifically to serve as the ultimate "system prompt" or context file for agentic tools like Claude Code or Cursor, ensuring they have the full picture before writing a single line of code.

---

# Stocky: Master Implementation Plan & Agent Context

## 1. Project Overview & Architecture

**Objective:** Develop a self-hosted, highly responsive inventory and project kitting system specifically designed for a home electronics laboratory.
**Core Philosophy:** Optimize for speed of manual data entry (rapid ingestion of sample books) and eliminate friction when sourcing parts for new KiCad projects.
**Technology Stack:**

* **Backend:** Golang (v1.22+), standard library `net/http` or `go-chi/chi`, `sqlc` for database access.
* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, `shadcn/ui`.
* **Database:** PostgreSQL (v16+). Strict relational tables combined with `JSONB` for schema-less parametric component data.
* **Deployment:** Docker & Docker Compose (Containerized API, Frontend, and DB) routed through a reverse proxy.

---

## 2. Database Schema (PostgreSQL)

The foundation relies on an Adjacency List for physical locations and an Entity-Attribute-Value (EAV) hybrid using `JSONB` for specific component parameters.

### 2.1 Core Tables

* **`locations`**: `id` (UUID), `parent_id` (UUID, nullable, FK to locations), `name` (VARCHAR), `type` (VARCHAR: room, rack, shelf, drawer, grid_bin).
* **`categories`**: `id` (UUID), `name` (VARCHAR - e.g., Resistor, Capacitor, IC).
* **`components`**: `id` (UUID), `mpn` (VARCHAR, nullable), `name` (VARCHAR), `category_id` (FK to categories), `attributes` (JSONB), `datasheet_url` (VARCHAR, nullable).
* **`inventory`**: `location_id` (FK), `component_id` (FK), `quantity` (INT). Primary Key is composite `(location_id, component_id)`.
* **`projects`**: `id` (UUID), `name` (VARCHAR), `status` (VARCHAR).
* **`project_boms`**: `project_id` (FK), `component_id` (FK), `required_qty` (INT), `allocated_qty` (INT).

### 2.2 JSONB `attributes` Schemas

Enforced by the backend/frontend logic based on the component's `category_id`.

```json
// Resistors
{ "footprint": "0805", "resistance_value": 10, "resistance_unit": "kΩ", "tolerance_percent": 1, "power_rating_watts": 0.125 }

// Capacitors
{ "footprint": "0603", "capacitance_value": 100, "capacitance_unit": "nF", "voltage_rating_v": 50, "dielectric": "X7R" }

// Diodes & LEDs
{ "footprint": "SOD-123", "type": "Schottky", "forward_voltage_v": 0.3, "max_current_a": 1.0, "color": null }

// ICs
{ "package": "SOIC-8", "pin_count": 8, "logic_family": "74HC", "protocol": null }

```

---

## 3. Backend API Specification (Golang)

*Base URL: `/api/v1*`

### 3.1 Locations & Components

* **`GET /locations/tree`**
* **Behavior:** Uses a recursive CTE to fetch all locations and nest them.
* **Response:** `[{ "id": "...", "name": "Workshop", "type": "room", "children": [...] }]`


* **`GET /components`**
* **Query Params:** `?location_id=uuid` (filters by bin and children), `?search=string`, `?category=string`.
* **Response:** Array of components joined with their aggregated inventory totals across all locations.


* **`POST /components/batch` (Rapid Entry)**
* **Behavior:** Accepts an array of components. Uses a DB transaction to insert the component and immediately map it to the `inventory` table.
* **Payload:** `{ "location_id": "uuid", "components": [ { "name": "10k", "category_id": "uuid", "attributes": {...}, "quantity": 50 } ] }`



### 3.2 KiCad BOM Automator

* **`POST /bom/kicad/analyze`**
* **Behavior:** Accepts `multipart/form-data` (CSV). Parses headers (Reference, Value, Footprint). Queries the `components` table matching `Value` and `attributes->>'footprint'`.
* **Response:** Returns a diff object showing required parts, matched DB records, in-stock quantity, and fulfillment status (`fully_stocked`, `partial`, `missing`).



---

## 4. Frontend Structure & UI Behaviors (Next.js)

### 4.1 Routing Structure

```text
src/app/
├── layout.tsx             # Global sidebar navigation
├── page.tsx               # Dashboard: Low Stock Alerts, Active Projects
├── inventory/page.tsx     # Storage Explorer: LocationTree (Left) + BinGrid (Right)
├── ingest/page.tsx        # Rapid Data Entry Module
└── projects/page.tsx      # KiCad BOM upload and Pick List generator

```

### 4.2 Core Workflows

**1. The Storage Explorer (`/inventory`)**

* **Visuals:** Split-pane. Left side is a collapsible folder tree of `locations`. Right side is a visual grid matching the physical drawers.
* **Behavior:** Clicking a root node ("Drawer 3") renders its child bins. Clicking a specific bin queries `GET /components?location_id=XYZ` to show exact contents.

**2. Rapid Data Entry Module (`/ingest`)**

* **Visuals:** Keyboard-navigable form rendering dynamic fields based on the selected Category schema.
* **Behavior (The "Save & Duplicate" Loop):** 1. User submits part (e.g., 10k Resistor).
2. API call succeeds.
3. UI clears the `dynamicValue` state (the "10") but **retains** the Location, Category, and Base Attributes (Footprint, Tolerance).
4. DOM focus immediately returns to the Value input field for the next entry.

**3. KiCad BOM Manager (`/projects`)**

* **Visuals:** Drag-and-drop zone for CSV, resulting in a color-coded data table (Green = Stocked, Red = Missing).
* **Behavior (Pick List Generation):** A button that aggregates all matched, in-stock parts and groups them by their `location_name`, creating an optimized physical walking route for pulling parts from the grid.

---

## 5. Agent Execution Phases

* **Phase 1:** Initialize PostgreSQL database, write `schema.sql`, and generate Go structs using `sqlc`.
* **Phase 2:** Scaffold the Go API. Implement the recursive location CTE and the CRUD endpoints for components.
* **Phase 3:** Initialize the Next.js frontend with `shadcn/ui`. Build the API client and the basic Dashboard layout.
* **Phase 4:** Build the `/ingest` page. Focus heavily on form state management and the "Save & Duplicate" workflow.
* **Phase 5:** Build the `/inventory` page. Implement the visual split-pane tree and grid explorer.
* **Phase 6:** Implement the Go CSV parser for KiCad and build the `/projects` frontend drag-and-drop interface.
* **Phase 7:** Write the `docker-compose.yml` to network the frontend, backend, and database for local deployment.

---

This file contains everything an AI workflow needs to understand the exact scope, data shapes, and required UX of the project.

Would you like me to draft the specific `docker-compose.yml` and `Dockerfile` configurations next so you have the infrastructure code ready to go?