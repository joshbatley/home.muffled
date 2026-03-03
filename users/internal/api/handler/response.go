package handler

import (
	"encoding/json"
	"net/http"
)

// WriteJSONError writes a JSON error response with the given status code and message.
// Sets Content-Type to application/json and body to {"error":"..."}.
func WriteJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
