.PHONY: setup setup-fe setup-be dev dev-fe dev-be dev-portal dev-users-fe

setup: setup-fe setup-be

setup-fe:
	pnpm --dir "./users/frontend" install --no-frozen-lockfile
	pnpm --dir "./portal" install --no-frozen-lockfile

setup-be:
	go -C "./users" mod download

dev: dev-fe dev-be

dev-fe:
	@echo "Starting users/frontend (:5174) and portal (:5173)"
	@sh -c 'trap "kill 0" INT TERM EXIT; \
		pnpm --dir "./users/frontend" dev & \
		pnpm --dir "./portal" dev & \
		wait'

dev-be:
	$(MAKE) -C "./users" run

dev-users-fe:
	pnpm --dir "./users/frontend" dev

dev-portal:
	pnpm --dir "./portal" dev
