package handlers

import (
	"encoding/csv"
	"encoding/json"
	"net/http"

	"github.com/stocky/api/internal/db"
)

type BOMHandler struct {
	queries *db.Queries
}

func NewBOMHandler(q *db.Queries) *BOMHandler {
	return &BOMHandler{queries: q}
}

type BOMLineItem struct {
	Reference string                    `json:"reference"`
	Value     string                    `json:"value"`
	Footprint string                    `json:"footprint"`
	Status    string                    `json:"status"` // fully_stocked, partial, missing
	Required  int                       `json:"required"`
	InStock   int32                     `json:"in_stock"`
	Matches   []db.ComponentWithCategory `json:"matches"`
}

func (h *BOMHandler) AnalyzeKiCad(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		http.Error(w, "failed to parse CSV: "+err.Error(), http.StatusBadRequest)
		return
	}

	if len(records) < 2 {
		respondJSON(w, http.StatusOK, []BOMLineItem{})
		return
	}

	// Find column indices
	headers := records[0]
	colIdx := map[string]int{}
	for i, h := range headers {
		colIdx[h] = i
	}

	refIdx, hasRef := colIdx["Reference"]
	valIdx, hasVal := colIdx["Value"]
	fpIdx, hasFp := colIdx["Footprint"]

	if !hasRef || !hasVal {
		http.Error(w, "CSV must have Reference and Value columns", http.StatusBadRequest)
		return
	}

	var results []BOMLineItem
	for _, row := range records[1:] {
		if len(row) == 0 {
			continue
		}
		ref := row[refIdx]
		val := row[valIdx]
		fp := ""
		if hasFp && fpIdx < len(row) {
			fp = row[fpIdx]
		}

		matches, err := h.queries.FindComponentsByValueAndFootprint(r.Context(), val, fp)
		if err != nil {
			matches = []db.ComponentWithCategory{}
		}

		var totalStock int32
		for _, m := range matches {
			totalStock += m.TotalQuantity
		}

		status := "missing"
		if totalStock > 0 {
			status = "fully_stocked" // simplified: 1 required per line
		}

		results = append(results, BOMLineItem{
			Reference: ref,
			Value:     val,
			Footprint: fp,
			Status:    status,
			Required:  1,
			InStock:   totalStock,
			Matches:   matches,
		})
	}

	if results == nil {
		results = []BOMLineItem{}
	}
	respondJSON(w, http.StatusOK, results)
}

// PickList returns a pick list grouped by location for the given component quantities.
// This is a placeholder implementation — location-aware pick routing can be added later.
func (h *BOMHandler) PickList(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Items []struct {
			ComponentID string `json:"component_id"`
			Quantity    int32  `json:"quantity"`
		} `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	type PickItem struct {
		ComponentName string `json:"component_name"`
		LocationName  string `json:"location_name"`
		Quantity      int32  `json:"quantity"`
	}
	locationMap := map[string][]PickItem{}

	respondJSON(w, http.StatusOK, locationMap)
}
