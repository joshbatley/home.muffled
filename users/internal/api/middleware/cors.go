package middleware

import (
	"net/http"
)

const (
	allowMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
	allowHeaders = "Authorization, Content-Type"
)

// CORS returns middleware that sets CORS headers when the request Origin
// is in allowedOrigins. If allowedOrigins is empty, the middleware is a no-op.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowedOrigin := ""
			if origin != "" && len(allowed) > 0 {
				if _, ok := allowed[origin]; ok {
					allowedOrigin = origin
				}
			}

			if r.Method == http.MethodOptions {
				if allowedOrigin != "" {
					w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
					w.Header().Set("Access-Control-Allow-Methods", allowMethods)
					w.Header().Set("Access-Control-Allow-Headers", allowHeaders)
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}

			if allowedOrigin != "" {
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			}
			next.ServeHTTP(w, r)
		})
	}
}

