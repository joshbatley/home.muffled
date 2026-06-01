.PHONY: all test run dev postgres-up postgres-down seed-admin frontend-install frontend-dev frontend-build

all: test

test:
	cd server && bun test

run:
	cd server && bun run start

dev:
	cd server && bun run dev

seed-admin:
	cd server && bun run seed-admin

postgres-up:
	docker compose up -d postgres

postgres-down:
	docker compose down

frontend-install:
	cd frontend && bun install

frontend-dev:
	cd frontend && bun run dev

frontend-build:
	cd frontend && bun run build
