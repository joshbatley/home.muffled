.PHONY: all build test vet tidy run postgres-up postgres-down seed-admin

all: test build

build:
	go build -o bin/server ./cmd/server

test:
	go test ./...

vet:
	go vet ./...

tidy:
	go mod tidy

run:
	go run ./cmd/server

postgres-up:
	docker compose up -d postgres

postgres-down:
	docker compose down

seed-admin:
	go run ./cmd/server -seed-admin
