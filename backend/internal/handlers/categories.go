package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stocky/api/internal/db"
)

type CategoryHandler struct {
	queries *db.Queries
}

func NewCategoryHandler(q *db.Queries) *CategoryHandler {
	return &CategoryHandler{queries: q}
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	cats, err := h.queries.ListCategories(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if cats == nil {
		cats = []db.Category{}
	}
	respondJSON(w, http.StatusOK, cats)
}

func (h *CategoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	cat, err := h.queries.GetCategory(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string          `json:"name"`
		Schema json.RawMessage `json:"schema"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	cat, err := h.queries.CreateCategory(r.Context(), db.CreateCategoryParams{
		Name:   req.Name,
		Schema: req.Schema,
	})
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			http.Error(w, "category name already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, cat)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req struct {
		Name   string          `json:"name"`
		Schema json.RawMessage `json:"schema"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	cat, err := h.queries.UpdateCategory(r.Context(), db.UpdateCategoryParams{
		ID:     id,
		Name:   req.Name,
		Schema: req.Schema,
	})
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			http.Error(w, "category name already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.queries.DeleteCategory(r.Context(), id); err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			http.Error(w, "Cannot delete — category has components", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
