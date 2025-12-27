version: "3.8"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/passive_compounder
      REDIS_URL: redis://redis:6379/0
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      SUPERMEMORY_API_KEY: ${SUPERMEMORY_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app
    command: >
      uvicorn app.main:app
      --host 0.0.0.0
      --port 8000
      --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000/api/v1
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    command: npm run dev

  db:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: passive_compounder
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: redis
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: celery_worker
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/passive_compounder
      REDIS_URL: redis://redis:6379/0
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      SUPERMEMORY_API_KEY: ${SUPERMEMORY_API_KEY}
    depends_on:
      - db
      - redis
    command: >
      celery -A app.tasks.celery_app
      worker
      --loglevel=info

  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: celery_beat
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/passive_compounder
      REDIS_URL: redis://redis:6379/0
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
    depends_on:
      - db
      - redis
    command: >
      celery -A app.tasks.celery_app
      beat
      --loglevel=info

volumes:
  postgres_data:
  redis_data:
