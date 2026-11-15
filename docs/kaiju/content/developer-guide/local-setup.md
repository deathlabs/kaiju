# Local Setup

Kaiju runs a Django backend and PostgreSQL database with Docker Compose.

## Prerequisites

Install the tools used by the repository:

* [Docker](https://docs.docker.com/engine/install/)
* [GNU Make](https://www.gnu.org/software/make/)
* [uv](https://docs.astral.sh/uv/getting-started/installation/)

## Configure the Application

Copy the example environment files and set values appropriate for your workstation.

```bash
cp backend/.env.example backend/.env
cp database/.env.example database/.env
```

Review the root [`README.md`](https://github.com/deathlabs/kaiju/blob/main/README.md) and `Makefile` before you start or deploy services.

## Start Kaiju

Install the backend and frontend dependencies before you start Kaiju.

```bash
cd backend/kaiju && uv sync --locked
cd ../../frontend/kaiju && npm ci
cd ../..
```

Start the local development stack.

```bash
make dev
```

The target starts PostgreSQL in Docker and applies the current database migrations. It creates or updates the local development exercise and participants. Repeated runs do not create duplicate records. The target runs the backend and frontend from source.

Open the frontend at `http://localhost:5173`. Open the backend at `http://localhost:8000`.

Local development generates a signed token for `Vic Fernandez III`. The frontend proxy adds the token to API requests.

Set `DEV_AUTH_DISABLED=1` to test unauthenticated API requests.

```bash
DEV_AUTH_DISABLED=1 make dev
```

Press `Ctrl+C` to stop the backend and frontend. The database continues to run in Docker.

When you no longer need the database, stop it.

```bash
docker compose --profile database down
```
