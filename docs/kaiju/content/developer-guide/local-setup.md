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
make setup
```

The target installs Ruff. It also runs `uv sync --locked` and `npm ci`.

Start the local development stack.

```bash
make dev
```

The target starts PostgreSQL in Docker and applies the current database migrations. It creates or updates the local development exercise and participants. Repeated runs do not create duplicate records. The target runs the backend and frontend from source.

The seed removes obsolete sample participants that have no responses. If an obsolete participant has responses or is the primary facilitator, the seed stops. It also stops if other existing participants would exceed a role limit. Resolve those records before you run the seed again.

Open the backend at `http://localhost:8000`. Each frontend uses a signed token for one seeded participant. The default ports are:

| Port | Role                 | Participant       |
| ---- | -------------------- | ----------------- |
| 5173 | Facilitator          | Justin Hartung    |
| 6001 | ISO                  | Daisuke Serizawa  |
| 6002 | ISSM                 | Vic Fernandez III      |
| 6003 | ISSO                 | Shinichi Ozaki    |
| 6004 | System administrator | Kiriko Tsujimori  |
| 6005 | User                 | Hiroshi Jinkawa   |
| 6006 | CSSP                 | Rando Yaguchi     |
| 6007 | OPFOR                | Yoji Akitsu       |

The script skips ports that are in use and prints the actual address for each participant. Open each address to use that participant's token. The seed command adds these participants to the seeded exercises. Add them to other exercises before testing participant features.

Set `DEV_AUTH_DISABLED=1` to test unauthenticated API requests.

```bash
DEV_AUTH_DISABLED=1 make dev
```

Press `Ctrl+C` to stop the backend and frontend. The database continues to run in Docker.

When you no longer need the database, stop it.

```bash
docker compose --profile database down
```
