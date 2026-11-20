# ---------------------------------------------------------
# Misc.
# ---------------------------------------------------------

# Use Bash as the default shell.
SHELL := /bin/bash

# Build the UDS Bundle by default.
.DEFAULT_GOAL := bundle

# Tell Docker to build images in parallel.
COMPOSE_BAKE := true

# Set the Docker Compose profile to "all" if an argument is not provided.
DOCKER_COMPOSE_PROFILE ?= all

# Set app metadata.
APP := kaiju
APP_VERSION ?= 0.1.0
ARCHITECTURE ?= amd64
ZARF_PACKAGE := zarf-package-$(APP)-$(ARCHITECTURE)-$(APP_VERSION).tar.zst
UDS_BUNDLE := uds-bundle-$(APP)-$(ARCHITECTURE)-$(APP_VERSION).tar.zst

# Set local development paths.
BACKEND_BUILD_CONTEXT := backend
BACKEND_SOURCE_DIR := $(BACKEND_BUILD_CONTEXT)/$(APP)
FRONTEND_BUILD_CONTEXT := frontend
FRONTEND_SOURCE_DIR := $(FRONTEND_BUILD_CONTEXT)/$(APP)
DESIGN_FILE := ../DESIGN.md
AUTH_ISSUER ?= https://kaiju.local/realms/development
AUTH_AUDIENCE ?= kaiju

# Backend values.
BACKEND_SBOM ?= $(APP)-backend-sbom.json
BACKEND_IMAGE ?= $(APP)/backend:latest
BACKEND_ADVISORIES ?= backend/vex.yaml
BACKEND_VEX ?= backend/vex.json
VEX_AUTHOR ?= Victor Fernandez III
VEX_ID_BASE ?= $(APP)

# Frontend values.
FRONTEND_SBOM ?= $(APP)-frontend-sbom.json
FRONTEND_IMAGE ?= $(APP)/frontend:latest
FRONTEND_ADVISORIES ?= frontend/vex.yaml
FRONTEND_VEX ?= frontend/vex.json

# Security scanner configurations.
SEMGREP_CONFIG ?= auto
GRYPE_FAILURE_THRESHOLD ?= medium

# ---------------------------------------------------------
# Set up the local development environment.
# ---------------------------------------------------------

.PHONY: setup
.SILENT: setup

setup:
	[ -f "backend/.env" ] || cp "backend/.env.example" "backend/.env"
	[ -f "database/.env" ] || cp "database/.env.example" "database/.env"
	scripts/setup.sh "$(BACKEND_SOURCE_DIR)" "$(FRONTEND_SOURCE_DIR)"

# ---------------------------------------------------------
# Run Zensical to serve documentation locally.
# ---------------------------------------------------------

.PHONY: docs
.SILENT: docs

docs:
	cd docs/kaiju && uv run --locked zensical serve --config-file zensical.toml --dev-addr 0.0.0.0:8001

# ---------------------------------------------------------
# Check the frontend design document.
# ---------------------------------------------------------

.PHONY: design-lint
.SILENT: design-lint

design-lint:
	cd "$(FRONTEND_SOURCE_DIR)" && npm exec -- design.md lint "$(DESIGN_FILE)"

# ---------------------------------------------------------
# Check the frontend design document and return JSON.
# ---------------------------------------------------------

.PHONY: design-lint-json
.SILENT: design-lint-json

design-lint-json:
	cd "$(FRONTEND_SOURCE_DIR)" && npm exec -- design.md lint --format json "$(DESIGN_FILE)"

# ---------------------------------------------------------
# Run the local development stack.
# ---------------------------------------------------------

.PHONY: dev
.SILENT: dev

dev:
	APP="$(APP)" \
	AUTH_AUDIENCE="$(AUTH_AUDIENCE)" \
	AUTH_ISSUER="$(AUTH_ISSUER)" \
	BACKEND_BUILD_CONTEXT="$(BACKEND_BUILD_CONTEXT)" \
	FRONTEND_BUILD_CONTEXT="$(FRONTEND_BUILD_CONTEXT)" \
		scripts/dev.sh

# ---------------------------------------------------------
# Update uv.lock.
# ---------------------------------------------------------

.PHONY: lock
.SILENT: lock

lock:
	cd backend/kaiju && uv lock

# ---------------------------------------------------------
# Reset Django migrations.
# ---------------------------------------------------------

.PHONY: migrations
.SILENT: migrations

migrations: 
	find backend/kaiju \
		-mindepth 3 -maxdepth 3 \
		-path "*/migrations/*.py" \
		! -name "__init__.py" \
		-type f -delete
	find backend/kaiju \
		-mindepth 3 -maxdepth 3 \
		-path "*/migrations/__pycache__" \
		-type d -exec rm -rf {} +
	cd backend/kaiju && SECRET_KEY=$(APP) uv run python manage.py makemigrations

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
	semgrep scan --config "$(SEMGREP_CONFIG)" \
		"$(BACKEND_BUILD_CONTEXT)" \
		"$(FRONTEND_BUILD_CONTEXT)"

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
  "@id": ($$id + "-" + $$timestamp),
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
	uds zarf tools yq -o=json "." "$(BACKEND_ADVISORIES)" | \
		jq --arg id "$(VEX_ID_BASE)-backend" "$$VEX_FILTER" > "$(BACKEND_VEX)"
	uds zarf tools yq -o=json "." "$(FRONTEND_ADVISORIES)" | \
		jq --arg id "$(VEX_ID_BASE)-frontend" "$$VEX_FILTER" > "$(FRONTEND_VEX)"

# ---------------------------------------------------------
# Generate SBOMs for the container images.
# ---------------------------------------------------------

.PHONY: sbom
.SILENT: sbom

sbom: build
	syft "$(BACKEND_IMAGE)" -o "cyclonedx-json=$(BACKEND_SBOM)"
	syft "$(FRONTEND_IMAGE)" -o "cyclonedx-json=$(FRONTEND_SBOM)"

# ---------------------------------------------------------
# Scan each container image's dependencies for vulnerabilities.
# ---------------------------------------------------------

.PHONY: dependency-scan
.SILENT: dependency-scan

dependency-scan: sbom vex
	grype db update && \
	if [ -f "$(BACKEND_VEX)" ]; then \
		grype "sbom:$(BACKEND_SBOM)" --vex "$(BACKEND_VEX)" --fail-on "$(GRYPE_FAILURE_THRESHOLD)"; \
	else \
		grype "sbom:$(BACKEND_SBOM)" --fail-on "$(GRYPE_FAILURE_THRESHOLD)"; \
	fi && \
	if [ -f "$(FRONTEND_VEX)" ]; then \
		grype "sbom:$(FRONTEND_SBOM)" --vex "$(FRONTEND_VEX)" --fail-on "$(GRYPE_FAILURE_THRESHOLD)"; \
	else \
		grype "sbom:$(FRONTEND_SBOM)" --fail-on "$(GRYPE_FAILURE_THRESHOLD)"; \
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
# Remove the database container, volume, and local files.
# ---------------------------------------------------------

.PHONY: clean
.SILENT: clean
clean:
	scripts/clean.sh

# ---------------------------------------------------------
# Check the status of the containers.
# ---------------------------------------------------------

.PHONY: status
.SILENT: status

status:
	docker compose --profile $(DOCKER_COMPOSE_PROFILE) ps --format "table {{.Name}}\t{{.Ports}}\t{{.Status}}"

# ---------------------------------------------------------
# Create the Zarf package for the UDS Bundle.
# ---------------------------------------------------------

.PHONY: package
.SILENT: package

package: dependency-scan
	uds zarf package create . --architecture "$(ARCHITECTURE)" --confirm
	test -f "$(ZARF_PACKAGE)"

# ---------------------------------------------------------
# Create the UDS Bundle delivery artifact.
# ---------------------------------------------------------

.PHONY: bundle
.SILENT: bundle

bundle: package
	uds create . --architecture "$(ARCHITECTURE)" --confirm
	test -f "$(UDS_BUNDLE)"

# ---------------------------------------------------------
# Deploy the UDS Bundle.
# ---------------------------------------------------------

.PHONY: deploy
.SILENT: deploy

deploy: bundle
	uds deploy "$(UDS_BUNDLE)" --confirm

# ---------------------------------------------------------
# Remove the application package deployed by the UDS Bundle.
# ---------------------------------------------------------

.PHONY: remove
.SILENT: remove

remove:
	uds zarf package remove $(APP) --confirm || true &&\
	uds zarf tools kubectl delete namespace $(APP) --ignore-not-found 

# ---------------------------------------------------------
# Redeploy the UDS Bundle.
# ---------------------------------------------------------

.PHONY: redeploy
.SILENT: redeploy

redeploy: remove deploy

# ---------------------------------------------------------
# Remove UDS finalizers.
# ---------------------------------------------------------

.PHONY: remove-finalizers
.SILENT: remove-finalizers

remove-finalizers:
	kubectl patch packages.uds.dev $(APP) -n $(APP) --type=merge -p '{"metadata":{"finalizers":[]}}'
