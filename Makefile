# ---------------------------------------------------------
# Misc.
# ---------------------------------------------------------

# Set the default goal.
.DEFAULT_GOAL := redeploy

# Tell Docker to build images in parallel.
COMPOSE_BAKE := true

# Set the Docker Compose profile to "all" if an argument is not provided.
DOCKER_COMPOSE_PROFILE ?= all

# Backend values.
BACKEND_SBOM ?= kaiju-backend-sbom.json
BACKEND_IMAGE ?= kaiju/backend:latest
BACKEND_ADVISORIES ?= backend/vex.yaml
BACKEND_VEX ?= backend/vex.json
VEX_AUTHOR ?= Victor Fernandez III
VEX_ID_BASE ?= kaiju-backend

# Security scanner configurations.
SEMGREP_CONFIG ?= auto
GRYPE_FAILURE_THRESHOLD ?= low

# ---------------------------------------------------------
# Update uv.lock.
# ---------------------------------------------------------

.PHONY: lock
.SILENT: lock

lock:
	cd backend && uv lock

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
# Check for bugs.
# ---------------------------------------------------------

.PHONY: check
.SILENT: check

check:
	ruff check --fix --exclude migrations

# ---------------------------------------------------------
# Format the source code for consistency.
# ---------------------------------------------------------

.PHONY: format
.SILENT: format

format:
	ruff format --exclude migrations

# ---------------------------------------------------------
# Check the source code for vulnerabilities.
# ---------------------------------------------------------

.PHONY: sast
.SILENT: sast

sast:
	semgrep scan --config $(SEMGREP_CONFIG) backend 

# ---------------------------------------------------------
# Build the container images.
# ---------------------------------------------------------

.PHONY: build
.SILENT: build

build: lock migrations check format 
	docker compose --profile $(DOCKER_COMPOSE_PROFILE) build

# ---------------------------------------------------------
# Generate VEX statements.
# ---------------------------------------------------------

.PHONY: vex
.SILENT: vex

define VEX_FILTER
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "$(VEX_ID_BASE)-" + now,
  "author": "$(VEX_AUTHOR)",
  "timestamp": now,
  "version": 1,
  "statements": [
    .advisories[] | {
      "vulnerability": { "name": .vuln },
      "products": [ .products[] | { "@id": . } ],
      "status": .status,
      "justification": .justification,
      "impact_statement": .impact_statement
    }
  ]
}
endef
export VEX_FILTER

vex:
	yq -o=json "$$VEX_FILTER" $(BACKEND_ADVISORIES) > $(BACKEND_VEX)

# ---------------------------------------------------------
# Generate SBOMs for the container images.
# ---------------------------------------------------------

.PHONY: sbom
.SILENT: sbom

sbom: 
	syft $(BACKEND_IMAGE) -o cyclonedx-json=$(BACKEND_SBOM)

# ---------------------------------------------------------
# Scan each container image's dependencies for vulnerabilities.
# ---------------------------------------------------------

.PHONY: dependency-scan
.SILENT: dependency-scan

dependency-scan: 
	grype db update &&\
	if [ -f "$(BACKEND_VEX)" ]; then \
		grype sbom:$(BACKEND_SBOM) --vex $(BACKEND_VEX) --fail-on $(GRYPE_FAILURE_THRESHOLD); \
	else \
		grype sbom:$(BACKEND_SBOM) --fail-on $(GRYPE_FAILURE_THRESHOLD); \
	fi

# ---------------------------------------------------------
# Start the containers.
# ---------------------------------------------------------

.PHONY: start
.SILENT: start

start: build sbom vex dependency-scan
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

deploy: build sbom vex dependency-scan
	uds zarf package create --confirm && \
	uds zarf package deploy zarf-package-kaiju-amd64-0.1.0.tar.zst --confirm

# ---------------------------------------------------------
# Remove the Zarf package.
# ---------------------------------------------------------

.PHONY: remove
.SILENT: remove

remove:
	uds zarf package remove kaiju --confirm || true &&\
	uds zarf tools kubectl delete namespace kaiju --ignore-not-found

# ---------------------------------------------------------
# Redeploy the Zarf package.
# ---------------------------------------------------------

.PHONY: redeploy
.SILENT: redeploy

redeploy: remove deploy
