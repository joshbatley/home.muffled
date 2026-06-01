.PHONY: all test run dev postgres-up postgres-down seed-admin web-install web-dev web-build

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
	cd server && docker compose up -d postgres

postgres-down:
	cd server && docker compose down

web-install:
	cd web && bun install

web-dev:
	cd web && bun run dev

web-build:
	cd web && bun run build
