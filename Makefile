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
# Run the linter and formatter.
# ---------------------------------------------------------

.PHONY: qa
.SILENT: qa

qa:
	ruff check --fix --exclude migrations &&\
	ruff format --exclude migrations

# ---------------------------------------------------------
# Reset Django migrations.
# ---------------------------------------------------------

.PHONY: migrations
.SILENT: migrations

migrations:
	find backend \
		-mindepth 3 -maxdepth 3 \
		-path "*/migrations/*.py" \
		! -name "__init__.py" \
		-type f -delete
	find backend \
		-mindepth 3 -maxdepth 3 \
		-path "*/migrations/__pycache__" \
		-type d -exec rm -rf {} +
	cd backend && SECRET_KEY=kaiju uv run python manage.py makemigrations

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

start: build
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
# Deploy the Zarf package.
# ---------------------------------------------------------

.PHONY: deploy
.SILENT: deploy

deploy: build
	uds zarf package create --confirm && \
	uds zarf package deploy zarf-package-kaiju-amd64-0.1.0.tar.zst --confirm

# ---------------------------------------------------------
# Remove the Zarf package.
# ---------------------------------------------------------

.PHONY: remove
.SILENT: remove

remove:
	-uds zarf package remove kaiju --confirm
	@if uds zarf tools kubectl get package.uds.dev kaiju -n kaiju >/dev/null 2>&1; then \
		echo "Waiting for UDS package cleanup..."; \
		uds zarf tools kubectl wait \
			--for=delete package.uds.dev/kaiju \
			-n kaiju \
			--timeout=60s; \
	fi
	uds zarf tools kubectl delete namespace kaiju \
		--ignore-not-found \
		--wait=true \
		--timeout=60s

# ---------------------------------------------------------
# Redeploy the Zarf package.
# ---------------------------------------------------------

.PHONY: redeploy
.SILENT: redeploy

redeploy: remove deploy
