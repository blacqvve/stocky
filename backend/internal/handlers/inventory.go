package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/stocky/api/internal/db"
)

type InventoryHandler struct {
	queries *db.Queries
}

func NewInventoryHandler(q *db.Queries) *InventoryHandler {
	return &InventoryHandler{queries: q}
}

func (h *InventoryHandler) GetByLocation(w http.ResponseWriter, r *http.Request) {
	locID, err := uuid.Parse(r.URL.Query().Get("location_id"))
	if err != nil {
		http.Error(w, "invalid location_id", http.StatusBadRequest)
		return
	}
	items, err := h.queries.GetInventoryByLocation(r.Context(), locID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []db.InventoryWithComponent{}
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *InventoryHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LocationID  string `json:"location_id"`
		ComponentID string `json:"component_id"`
		Quantity    int32  `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	locID, err := uuid.Parse(req.LocationID)
	if err != nil {
		http.Error(w, "invalid location_id", http.StatusBadRequest)
		return
	}
	compID, err := uuid.Parse(req.ComponentID)
	if err != nil {
		http.Error(w, "invalid component_id", http.StatusBadRequest)
		return
	}
	inv, err := h.queries.UpsertInventory(r.Context(), db.UpsertInventoryParams{
		LocationID:  locID,
		ComponentID: compID,
		Quantity:    req.Quantity,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, inv)
}

func (h *InventoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	locID, err := uuid.Parse(r.URL.Query().Get("location_id"))
	if err != nil {
		http.Error(w, "invalid location_id", http.StatusBadRequest)
		return
	}
	compID, err := uuid.Parse(r.URL.Query().Get("component_id"))
	if err != nil {
		http.Error(w, "invalid component_id", http.StatusBadRequest)
		return
	}
	if err := h.queries.DeleteInventory(r.Context(), locID, compID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *InventoryHandler) Adjust(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LocationID  string `json:"location_id"`
		ComponentID string `json:"component_id"`
		Delta       int32  `json:"delta"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	locID, err := uuid.Parse(req.LocationID)
	if err != nil {
		http.Error(w, "invalid location_id", http.StatusBadRequest)
		return
	}
	compID, err := uuid.Parse(req.ComponentID)
	if err != nil {
		http.Error(w, "invalid component_id", http.StatusBadRequest)
		return
	}
	inv, err := h.queries.AdjustInventory(r.Context(), db.UpsertInventoryParams{
		LocationID:  locID,
		ComponentID: compID,
		Quantity:    req.Delta,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, inv)
}
