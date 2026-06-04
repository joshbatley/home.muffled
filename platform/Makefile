.PHONY: up down logs migrate sync-functions

COMPOSE := docker compose -f docker-compose.yml -f docker-compose.override.yml

up:
	$(COMPOSE) --env-file .env up -d

down:
	$(COMPOSE) --env-file .env down

logs:
	$(COMPOSE) --env-file .env logs -f

sync-functions:
	cp -R functions/admin-create-user volumes/functions/admin-create-user

migrate: sync-functions
	chmod +x scripts/apply-migrations.sh
	./scripts/apply-migrations.sh
