package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

// Health handles health check endpoints.
type Health struct {
	DB *sql.DB
}

// Heartbeat handles GET /health (or /v1/health). Returns 200 if the app is responding.
func (h *Health) Heartbeat(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// Ready handles GET /health/ready (or /v1/health/ready). Returns 200 if the app can reach the database.
func (h *Health) Ready(w http.ResponseWriter, r *http.Request) {
	if h.DB == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"status": "unavailable", "error": "database not configured"})
		return
	}
	if err := h.DB.Ping(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"status": "unavailable", "error": "database unreachable"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
