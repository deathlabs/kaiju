# ---------------------------------------------------------
# Misc.
# ---------------------------------------------------------

# Set the default goal.
.DEFAULT_GOAL := build

# Tell Docker to build images in parallel.
COMPOSE_BAKE := true

# Set the Docker Compose profile to "all" if an argument is not provided.
DOCKER_COMPOSE_PROFILE ?= all

# ---------------------------------------------------------
# Build the containers.
# ---------------------------------------------------------

.PHONY: build
.SILENT: build

build: qa
	docker compose --profile $(DOCKER_COMPOSE_PROFILE) build

# ---------------------------------------------------------
# Start the containers.
# ---------------------------------------------------------

.PHONY: start
.SILENT: start

start: qa
	docker compose --profile $(DOCKER_COMPOSE_PROFILE) up -d

# ---------------------------------------------------------
# Stop the containers.
# ---------------------------------------------------------

.PHONY: stop
.SILENT: stop

stop: 
	docker compose --profile $(DOCKER_COMPOSE_PROFILE) down

# ---------------------------------------------------------
# Check the status of the containers.
# ---------------------------------------------------------

.PHONY: status
.SILENT: status

status:
	docker compose --profile $(DOCKER_COMPOSE_PROFILE) ps --format "table {{.Name}}\t{{.Ports}}\t{{.Status}}"

# ---------------------------------------------------------
# Run the linter and formatter.
# ---------------------------------------------------------

.PHONY: qa
.SILENT: qa

qa:
	ruff check --fix --exclude migrations &&\
	ruff format --exclude migrations
