.PHONY: api-local api-up api-logs api-restart api-down api-rebuild api-cache

# Repo root Makefile shortcuts for the Notes API
# Usage:
# make api-up        - Docker up + init
# make api-logs      - follow logs
# make api-restart   - restart app container
# make api-down      - stop stack

API_DIR := notes-api
COMPOSE := docker compose -f ./notes-api/docker-compose.yml

api-local:
	@bash "$(API_DIR)/run-local.sh"

api-up:
	@bash "$(API_DIR)/run-docker.sh"

api-logs:
	@$(COMPOSE) logs -f app

api-restart:
	@$(COMPOSE) restart app

api-down:
	@$(COMPOSE) down

api-rebuild:
	@$(COMPOSE) build app && $(COMPOSE) up -d --force-recreate app

api-cache:
	@$(COMPOSE) exec app php artisan optimize:clear
