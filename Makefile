.PHONY: setup setup-fe setup-be dev dev-fe dev-be dev-portal dev-users-fe

setup: setup-fe setup-be

setup-fe:
	pnpm --dir "./users/web" install --no-frozen-lockfile
	pnpm --dir "./portal" install --no-frozen-lockfile

setup-be:
	go -C "./users/server" mod download

dev: dev-fe dev-be

dev-fe:
	@echo "Starting users/web (:5174) and portal (:5173)"
	@sh -c 'trap "kill 0" INT TERM EXIT; \
		pnpm --dir "./users/web" dev & \
		pnpm --dir "./portal" dev & \
		wait'

dev-be:
	$(MAKE) -C "./users/server" run

dev-users-fe:
	pnpm --dir "./users/web" dev

dev-portal:
	pnpm --dir "./portal" dev
