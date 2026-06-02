.PHONY: setup setup-fe setup-platform dev dev-fe dev-portal dev-users test platform-up platform-down platform-logs platform-migrate

setup: setup-fe setup-platform

setup-fe:
	cd lib/auth && bun install
	cd users && bun install
	cd portal && bun install

setup-platform:
	cd platform && test -f .env || cp .env.example .env

test:

dev: dev-fe

dev-fe:
	@echo "Starting users (:5174) and portal (:5173)"
	@sh -c 'trap "kill 0" INT TERM EXIT; \
		cd users && bun run dev & \
		cd portal && bun run dev & \
		wait'

dev-portal:
	cd portal && bun run dev

dev-users:
	cd users && bun run dev

platform-up:
	$(MAKE) -C platform sync-functions up

platform-down:
	$(MAKE) -C platform down

platform-logs:
	$(MAKE) -C platform logs

platform-migrate:
	$(MAKE) -C platform migrate

portal-build:
	cd portal && bun run build

users-build:
	cd users && bun run build
