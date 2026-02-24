.PHONY: help build run test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the auth service binary
	go build -o bin/authservice ./cmd/authservice

run: ## Run the auth service
	go run ./cmd/authservice

test: ## Run all tests
	go test ./...
