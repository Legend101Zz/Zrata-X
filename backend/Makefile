# ------------------------------
# Zrata-X Backend Makefile
# ------------------------------

# Default target
.DEFAULT_GOAL := help

# Run FastAPI in development mode
dev:
	uv run uvicorn app.main:app --reload --port 8000

# Run FastAPI in production mode
start:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Start Celery worker
celery-worker:
	uv run celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery beat scheduler
celery-beat:
	uv run celery -A app.tasks.celery_app beat --loglevel=info

# Seed initial data
seed:
	uv run python -m app.scripts.init_seed_data

# Apply database migrations
migrate:
	uv run alembic upgrade head

# Create new migration (usage: make makemigrations name="add_users_table")
makemigrations:
	uv run alembic revision --autogenerate -m "$(name)"

# Run tests
test:
	uv run pytest

# Lint code
lint:
	uv run ruff check .

# Format code
format:
	uv run ruff format .

# Show available commands
help:
	@echo ""
	@echo "Available commands:"
	@echo "  make dev              Run FastAPI in dev mode"
	@echo "  make start            Run FastAPI in prod mode"
	@echo "  make celery-worker    Start Celery worker"
	@echo "  make celery-beat      Start Celery beat"
	@echo "  make seed             Seed initial data"
	@echo "  make migrate          Apply DB migrations"
	@echo "  make makemigrations   Create new migration"
	@echo "  make test             Run tests"
	@echo "  make lint             Run ruff linter"
	@echo "  make format           Format code"
	@echo ""
