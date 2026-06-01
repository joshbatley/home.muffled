.PHONY: portal-install portal-dev portal-build auth-ts-install

auth-ts-install:
	cd lib/auth-ts && bun install

portal-install: auth-ts-install
	cd portal && bun install

portal-dev:
	cd portal && bun run dev

portal-build:
	cd portal && bun run build
