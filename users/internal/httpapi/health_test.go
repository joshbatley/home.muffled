package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth_Heartbeat(t *testing.T) {
	h := &Health{}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	h.Heartbeat(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d", rec.Code)
	}
}
