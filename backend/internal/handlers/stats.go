package handlers

import (
	"net/http"

	"github.com/stocky/api/internal/db"
)

type StatsHandler struct {
	queries *db.Queries
}

func NewStatsHandler(q *db.Queries) *StatsHandler {
	return &StatsHandler{queries: q}
}

func (h *StatsHandler) Get(w http.ResponseWriter, r *http.Request) {
	stats, err := h.queries.GetStats(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, stats)
}
