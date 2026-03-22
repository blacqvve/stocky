package handlers

import (
	"encoding/json"
	"fmt"
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

func (h *LocationHandler) GenerateGrid(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var req struct {
		Rows   int `json:"rows"`
		Cols   int `json:"cols"`
		Layers int `json:"layers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Rows < 1 || req.Cols < 1 {
		http.Error(w, "rows and cols must be at least 1", http.StatusBadRequest)
		return
	}
	if req.Layers < 1 {
		req.Layers = 1
	}
	if req.Rows*req.Cols*req.Layers > 2000 {
		http.Error(w, "grid too large (max 2000 cells)", http.StatusBadRequest)
		return
	}

	var created []db.Location
	for row := 0; row < req.Rows; row++ {
		rowLabel := gridRowLabel(row)
		for col := 1; col <= req.Cols; col++ {
			for layer := 1; layer <= req.Layers; layer++ {
				var name string
				if req.Layers == 1 {
					name = fmt.Sprintf("%s%d", rowLabel, col)
				} else {
					name = fmt.Sprintf("%s%d-%d", rowLabel, col, layer)
				}
				loc, err := h.queries.CreateLocation(r.Context(), db.CreateLocationParams{
					ParentID: &id,
					Name:     name,
					Type:     "grid_bin",
				})
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				created = append(created, loc)
			}
		}
	}

	if created == nil {
		created = []db.Location{}
	}
	respondJSON(w, http.StatusCreated, created)
}

// gridRowLabel converts a 0-based row index to a spreadsheet-style label: A, B, ..., Z, AA, AB, ...
func gridRowLabel(i int) string {
	if i < 26 {
		return string(rune('A' + i))
	}
	return fmt.Sprintf("%c%c", rune('A'+(i/26)-1), rune('A'+(i%26)))
}
