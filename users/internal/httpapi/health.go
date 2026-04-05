package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type Health struct {
	DB *sql.DB
}

func (h *Health) Heartbeat(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *Health) Ready(w http.ResponseWriter, r *http.Request) {
	if h.DB == nil {
		WriteJSONError(w, http.StatusServiceUnavailable, "no database")
		return
	}
	if err := h.DB.Ping(); err != nil {
		WriteJSONError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
}
