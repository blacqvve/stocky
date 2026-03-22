package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stocky/api/internal/db"
	"github.com/stocky/api/internal/handlers"
	"github.com/stocky/api/internal/middleware"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://stocky:stocky@localhost:5432/stocky?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("unable to ping database: %v", err)
	}
	log.Println("Connected to database")

	queries := db.New(pool)

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}

	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check (no auth)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API routes with optional basic auth
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.BasicAuth)

		// Locations
		lh := handlers.NewLocationHandler(queries)
		r.Get("/locations/tree", lh.GetTree)
		r.Get("/locations", lh.List)
		r.Post("/locations", lh.Create)
		r.Get("/locations/{id}", lh.Get)
		r.Put("/locations/{id}", lh.Update)
		r.Delete("/locations/{id}", lh.Delete)
		r.Post("/locations/{id}/generate-grid", lh.GenerateGrid)

		// Categories
		ch := handlers.NewCategoryHandler(queries)
		r.Get("/categories", ch.List)
		r.Get("/categories/{id}", ch.Get)
		r.Post("/categories", ch.Create)
		r.Put("/categories/{id}", ch.Update)
		r.Delete("/categories/{id}", ch.Delete)

		// Components
		comph := handlers.NewComponentHandler(queries)
		r.Get("/components", comph.List)
		r.Post("/components", comph.Create)
		r.Post("/components/batch", comph.BatchCreate)
		r.Get("/components/{id}", comph.Get)
		r.Put("/components/{id}", comph.Update)
		r.Delete("/components/{id}", comph.Delete)

		// Inventory
		ih := handlers.NewInventoryHandler(queries)
		r.Get("/inventory", ih.GetByLocation)
		r.Post("/inventory", ih.Upsert)
		r.Post("/inventory/adjust", ih.Adjust)

		// Projects
		ph := handlers.NewProjectHandler(queries)
		r.Get("/projects", ph.List)
		r.Post("/projects", ph.Create)
		r.Get("/projects/{id}", ph.Get)
		r.Put("/projects/{id}/status", ph.UpdateStatus)
		r.Get("/projects/{id}/bom", ph.GetBOM)

		// Stats
		sh := handlers.NewStatsHandler(queries)
		r.Get("/stats", sh.Get)

		// BOM analysis
		bh := handlers.NewBOMHandler(queries)
		r.Post("/bom/kicad/analyze", bh.AnalyzeKiCad)
		r.Post("/bom/picklist", bh.PickList)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Stocky API listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
