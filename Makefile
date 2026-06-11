.PHONY: setup setup-fe setup-platform dev dev-fe dev-portal dev-users dev-all auth-build test platform-up platform-down platform-logs platform-migrate fe-build users-build users-preview portal-build portal-build-prod portal-preview preview-all

setup: setup-fe setup-platform

setup-fe:
	cd lib/auth && bun install && bun run build
	cd users && bun install
	cd portal && bun install

setup-platform:
	cd platform && test -f .env || cp .env.example .env

auth-build:
	cd lib/auth && bun run build

test:

dev: dev-portal

dev-fe: dev

dev-portal:
	cd portal && bun run dev

dev-users:
	cd users && bun run dev

dev-all:
	@echo "Starting users remote on :5174, then portal on :5173"
	cd users && bun run dev &
	sleep 2
	cd portal && bun run dev

platform-up:
	$(MAKE) -C platform sync-functions up

platform-down:
	$(MAKE) -C platform down

platform-logs:
	$(MAKE) -C platform logs

platform-migrate:
	$(MAKE) -C platform migrate

USERS_PREVIEW_PORT ?= 5174
PORTAL_PREVIEW_PORT ?= 5173
USERS_REMOTE_ENTRY ?= http://localhost:$(USERS_PREVIEW_PORT)/remoteEntry.js

fe-build: users-build portal-build-prod

users-build:
	cd lib/auth && bun run build
	cd users && bun run build

users-preview: users-build
	cd users && bun run preview

portal-build:
	cd lib/auth && bun run build
	cd portal && bun run build

portal-build-prod: auth-build
	@test -n "$(VITE_USERS_REMOTE_ENTRY)" || (echo "VITE_USERS_REMOTE_ENTRY is required (e.g. https://users.example.com/remoteEntry.js)" && exit 1)
	cd portal && VITE_USERS_REMOTE_ENTRY="$(VITE_USERS_REMOTE_ENTRY)" bun run build

portal-preview:
	cd portal && VITE_USERS_REMOTE_ENTRY="$(USERS_REMOTE_ENTRY)" bun run build
	cd portal && bun run preview

preview-all: users-build
	@echo "Building portal against $(USERS_REMOTE_ENTRY)"
	cd portal && VITE_USERS_REMOTE_ENTRY="$(USERS_REMOTE_ENTRY)" bun run build
	@echo "Starting users preview on :$(USERS_PREVIEW_PORT), then portal on :$(PORTAL_PREVIEW_PORT)"
	cd users && bun run preview &
	sleep 2
	cd portal && bun run preview
