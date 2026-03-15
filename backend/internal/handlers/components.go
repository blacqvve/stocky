package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stocky/api/internal/db"
)

type ComponentHandler struct {
	queries *db.Queries
}

func NewComponentHandler(q *db.Queries) *ComponentHandler {
	return &ComponentHandler{queries: q}
}

func (h *ComponentHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := db.SearchComponentsParams{}

	if s := q.Get("search"); s != "" {
		params.Search = &s
	}
	if c := q.Get("category_id"); c != "" {
		id, err := uuid.Parse(c)
		if err == nil {
			params.CategoryID = &id
		}
	}
	if l := q.Get("location_id"); l != "" {
		id, err := uuid.Parse(l)
		if err == nil {
			params.LocationID = &id
		}
	}

	components, err := h.queries.SearchComponents(r.Context(), params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if components == nil {
		components = []db.ComponentWithCategory{}
	}
	respondJSON(w, http.StatusOK, components)
}

func (h *ComponentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	comp, err := h.queries.GetComponent(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, comp)
}

func (h *ComponentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Mpn          *string         `json:"mpn"`
		Name         string          `json:"name"`
		CategoryID   string          `json:"category_id"`
		Attributes   json.RawMessage `json:"attributes"`
		DatasheetUrl *string         `json:"datasheet_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	catID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		http.Error(w, "invalid category_id", http.StatusBadRequest)
		return
	}
	if req.Attributes == nil {
		req.Attributes = json.RawMessage(`{}`)
	}
	comp, err := h.queries.CreateComponent(r.Context(), db.CreateComponentParams{
		Mpn:          req.Mpn,
		Name:         req.Name,
		CategoryID:   catID,
		Attributes:   req.Attributes,
		DatasheetUrl: req.DatasheetUrl,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusCreated, comp)
}

func (h *ComponentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req struct {
		Mpn          *string         `json:"mpn"`
		Name         string          `json:"name"`
		CategoryID   string          `json:"category_id"`
		Attributes   json.RawMessage `json:"attributes"`
		DatasheetUrl *string         `json:"datasheet_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	catID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		http.Error(w, "invalid category_id", http.StatusBadRequest)
		return
	}
	if req.Attributes == nil {
		req.Attributes = json.RawMessage(`{}`)
	}
	comp, err := h.queries.UpdateComponent(r.Context(), db.UpdateComponentParams{
		ID:           id,
		Mpn:          req.Mpn,
		Name:         req.Name,
		CategoryID:   catID,
		Attributes:   req.Attributes,
		DatasheetUrl: req.DatasheetUrl,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, comp)
}

func (h *ComponentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.queries.DeleteComponent(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ComponentHandler) BatchCreate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LocationID string `json:"location_id"`
		Components []struct {
			Mpn          *string         `json:"mpn"`
			Name         string          `json:"name"`
			CategoryID   string          `json:"category_id"`
			Attributes   json.RawMessage `json:"attributes"`
			DatasheetUrl *string         `json:"datasheet_url"`
			Quantity     int32           `json:"quantity"`
		} `json:"components"`
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

	var created []db.Component
	for _, c := range req.Components {
		catID, err := uuid.Parse(c.CategoryID)
		if err != nil {
			continue
		}
		if c.Attributes == nil {
			c.Attributes = json.RawMessage(`{}`)
		}
		comp, err := h.queries.CreateComponent(r.Context(), db.CreateComponentParams{
			Mpn:          c.Mpn,
			Name:         c.Name,
			CategoryID:   catID,
			Attributes:   c.Attributes,
			DatasheetUrl: c.DatasheetUrl,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_, err = h.queries.UpsertInventory(r.Context(), db.UpsertInventoryParams{
			LocationID:  locID,
			ComponentID: comp.ID,
			Quantity:    c.Quantity,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		created = append(created, comp)
	}
	if created == nil {
		created = []db.Component{}
	}
	respondJSON(w, http.StatusCreated, created)
}
