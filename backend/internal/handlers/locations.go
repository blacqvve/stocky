package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stocky/api/internal/db"
)

type LocationHandler struct {
	queries *db.Queries
}

func NewLocationHandler(q *db.Queries) *LocationHandler {
	return &LocationHandler{queries: q}
}

type LocationNode struct {
	db.Location
	Children []LocationNode `json:"children"`
}

func buildTree(locations []db.Location, parentID *uuid.UUID) []LocationNode {
	var nodes []LocationNode
	for _, loc := range locations {
		if (parentID == nil && loc.ParentID == nil) ||
			(parentID != nil && loc.ParentID != nil && *loc.ParentID == *parentID) {
			node := LocationNode{Location: loc}
			node.Children = buildTree(locations, &loc.ID)
			nodes = append(nodes, node)
		}
	}
	return nodes
}

func (h *LocationHandler) GetTree(w http.ResponseWriter, r *http.Request) {
	locations, err := h.queries.GetLocationTree(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	tree := buildTree(locations, nil)
	if tree == nil {
		tree = []LocationNode{}
	}
	respondJSON(w, http.StatusOK, tree)
}

func (h *LocationHandler) List(w http.ResponseWriter, r *http.Request) {
	locations, err := h.queries.ListLocations(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if locations == nil {
		locations = []db.Location{}
	}
	respondJSON(w, http.StatusOK, locations)
}

func (h *LocationHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	loc, err := h.queries.GetLocation(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, loc)
}

func (h *LocationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ParentID *string `json:"parent_id"`
		Name     string  `json:"name"`
		Type     string  `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	params := db.CreateLocationParams{Name: req.Name, Type: req.Type}
	if req.ParentID != nil {
		id, err := uuid.Parse(*req.ParentID)
		if err != nil {
			http.Error(w, "invalid parent_id", http.StatusBadRequest)
			return
		}
		params.ParentID = &id
	}

	loc, err := h.queries.CreateLocation(r.Context(), params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, loc)
}

func (h *LocationHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req struct {
		ParentID *string `json:"parent_id"`
		Name     string  `json:"name"`
		Type     string  `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	params := db.UpdateLocationParams{ID: id, Name: req.Name, Type: req.Type}
	if req.ParentID != nil {
		pid, err := uuid.Parse(*req.ParentID)
		if err != nil {
			http.Error(w, "invalid parent_id", http.StatusBadRequest)
			return
		}
		params.ParentID = &pid
	}

	loc, err := h.queries.UpdateLocation(r.Context(), params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, loc)
}

func (h *LocationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.queries.DeleteLocation(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
