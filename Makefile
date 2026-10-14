# ---------------------------------------------------------
# Misc.
# ---------------------------------------------------------

# Set the default goal.
.DEFAULT_GOAL := redeploy

# Tell Docker to build images in parallel.
COMPOSE_BAKE := true

# Set the Docker Compose profile to "all" if an argument is not provided.
DOCKER_COMPOSE_PROFILE ?= all

# Set app metadata.
APP := kaiju

# Backend values.
BACKEND_SBOM ?= $(APP)-backend-sbom.json
BACKEND_IMAGE ?= $(APP)/backend:latest
BACKEND_ADVISORIES ?= backend/vex.yaml
BACKEND_VEX ?= backend/vex.json
VEX_AUTHOR ?= Victor Fernandez III
VEX_ID_BASE ?= $(APP)-backend

# Security scanner configurations.
SEMGREP_CONFIG ?= auto
GRYPE_FAILURE_THRESHOLD ?= medium

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
	cd backend && SECRET_KEY=$(APP) uv run python manage.py makemigrations

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
(now | todateiso8601) as $$timestamp | {
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": ("$(VEX_ID_BASE)-" + $$timestamp),
  "author": "$(VEX_AUTHOR)",
  "timestamp": $$timestamp,
  "version": 1,
  "statements": [
    .advisories[] | {
      "vulnerability": { "name": .vulnerability },
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
	yq "$$VEX_FILTER" "$(BACKEND_ADVISORIES)" > "$(BACKEND_VEX)"

# ---------------------------------------------------------
# Generate SBOMs for the container images.
# ---------------------------------------------------------

.PHONY: sbom
.SILENT: sbom

sbom: build
	syft $(BACKEND_IMAGE) -o cyclonedx-json=$(BACKEND_SBOM)

# ---------------------------------------------------------
# Scan each container image's dependencies for vulnerabilities.
# ---------------------------------------------------------

.PHONY: dependency-scan
.SILENT: dependency-scan

dependency-scan: sbom vex
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

start: dependency-scan
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

deploy: dependency-scan
	uds zarf package create --confirm && \
	uds zarf package deploy zarf-package-$(APP)-amd64-0.1.0.tar.zst --confirm

# ---------------------------------------------------------
# Remove the Zarf package.
# ---------------------------------------------------------

.PHONY: remove
.SILENT: remove

remove:
	uds zarf package remove $(APP) --confirm || true &&\
	uds zarf tools kubectl delete namespace $(APP) --ignore-not-found 

# ---------------------------------------------------------
# Redeploy the Zarf package.
# ---------------------------------------------------------

.PHONY: redeploy
.SILENT: redeploy

redeploy: remove deploy

# ---------------------------------------------------------
# Update the UDS package.
# ---------------------------------------------------------

.PHONY: update-uds-package
.SILENT: update-uds-package

update-uds-package: 
	uds zarf tools kubectl apply -f uds-package.yaml

# ---------------------------------------------------------
# Remove UDS finalizers.
# ---------------------------------------------------------

.PHONY: remove-finalizers
.SILENT: remove-finalizers

remove-finalizers:
	kubectl patch packages.uds.dev $(APP) -n $(APP) --type=merge -p '{"metadata":{"finalizers":[]}}'
