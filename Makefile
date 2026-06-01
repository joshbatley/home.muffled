.PHONY: setup setup-fe setup-be dev dev-fe dev-be dev-portal dev-users-web test

setup: setup-fe setup-be

setup-fe:
	cd lib/auth-ts && bun install
	cd users/web && bun install
	cd portal && bun install

setup-be:
	cd users/server && bun install

test:
	cd users/server && bun test

dev: dev-fe dev-be

dev-fe:
	@echo "Starting users/web (:5174) and portal (:5173)"
	@sh -c 'trap "kill 0" INT TERM EXIT; \
		cd users/web && bun run dev & \
		cd portal && bun run dev & \
		wait'

dev-be:
	$(MAKE) -C users run

dev-users-web:
	cd users/web && bun run dev

dev-portal:
	cd portal && bun run dev

portal-build:
	cd portal && bun run build

web-build:
	cd users/web && bun run build
