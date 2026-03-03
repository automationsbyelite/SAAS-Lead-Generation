# 🐳 Docker Guide — SAAS Lead Generation Platform

This guide covers how to run the full platform (Backend, Frontend, Worker, PostgreSQL, Redis) using Docker for **local development** and **production** deployment.

---

## 📁 Project Structure

```
SAAS-Lead-Generation/
├── apps/
│   ├── backend/         # NestJS API  → port 3000
│   ├── frontend/        # Next.js UI  → port 4000
│   └── worker/          # NestJS Worker (no HTTP port)
├── packages/
│   ├── shared/          # Shared types & enums
│   └── ai-call/         # AI calling utilities
├── docker-compose.yml       ← LOCAL DEVELOPMENT
├── docker-compose.prod.yml  ← PRODUCTION
├── .env.example             ← Copy → .env or .env.production
└── .dockerignore
```

---

## 🚀 Quick Start — Local Development

### 1. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual API keys. The database/Redis settings are pre-filled for Docker:

```env
DB_HOST=postgres      # ← Docker service name (do NOT use localhost)
REDIS_HOST=redis      # ← Docker service name (do NOT use localhost)
```

### 2. Build & Start all containers

```bash
docker compose up --build
```

This starts **5 containers** together:

| Container       | Service    | Port | Description              |
| --------------- | ---------- | ---- | ------------------------ |
| `saas_postgres` | PostgreSQL | 5432 | Database                 |
| `saas_redis`    | Redis      | 6379 | BullMQ queue broker      |
| `saas_backend`  | NestJS API | 3000 | REST API + WebSockets    |
| `saas_frontend` | Next.js    | 4000 | React frontend           |
| `saas_worker`   | Worker     | —    | Background job processor |

### 3. Access the app

| Service  | URL                       |
| -------- | ------------------------- |
| Frontend | http://localhost:4000     |
| Backend  | http://localhost:3000     |
| API Docs | http://localhost:3000/api |

---

## 🔥 Hot Reload (Auto-Update Without Rebuild)

**All services support auto-reload in development** — no need to restart containers when you edit code!

| Service  | Technology            | What Triggers Reload                                |
| -------- | --------------------- | --------------------------------------------------- |
| Backend  | `nest start --watch`  | Any change in `apps/backend/src/**`                 |
| Frontend | Next.js HMR           | Any change in `apps/frontend/src/**`                |
| Worker   | `nodemon` + `ts-node` | Any change in `apps/worker/src/**` or `packages/**` |

> **Just edit your files normally** — Docker volume mounts ensure changes on your host are instantly reflected in the containers.

---

## 🛠️ Common Development Commands

### Start/Stop

```bash
# Start all services (with rebuild)
docker compose up --build

# Start all services (skip rebuild if unchanged)
docker compose up

# Start in background (detached mode)
docker compose up -d

# Stop all services (keeps data volumes)
docker compose down

# Stop and delete ALL data (fresh start)
docker compose down -v
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f worker
docker compose logs -f postgres
docker compose logs -f redis
```

### Rebuild a Single Service

```bash
# After changing Dockerfile or package.json
docker compose up --build backend
docker compose up --build frontend
docker compose up --build worker
```

### Run Commands Inside a Container

```bash
# Open a shell in the backend container
docker compose exec backend sh

# Run NestJS CLI commands (e.g., generate a module)
docker compose exec backend npx nest g module my-module

# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d saas

# Monitor Redis queues
docker compose exec redis redis-cli monitor
```

### Install New npm Packages

> ⚠️ Always install packages on **your host machine**, then rebuild the container so node_modules are refreshed.

```bash
# 1. Install on host
cd apps/backend && npm install some-package

# 2. Rebuild the backend container
docker compose up --build backend
```

---

## 🏭 Production Deployment

### 1. Create your production `.env` file

```bash
cp .env.example .env.production
```

Fill in all **real secrets** (Stripe keys, SMTP credentials, API keys, strong passwords, etc.).

```env
NODE_ENV=production
DB_PASSWORD=a-very-strong-db-password
JWT_SECRET=a-very-strong-jwt-secret-256-bits
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Build & Start Production containers

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### 3. View Production Logs

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Stop Production

```bash
docker compose -f docker-compose.prod.yml down
```

---

## 🔄 Updating Production Containers

When you push new code to production:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart with zero-downtime rolling update
docker compose -f docker-compose.prod.yml up --build -d --no-deps backend
docker compose -f docker-compose.prod.yml up --build -d --no-deps frontend
docker compose -f docker-compose.prod.yml up --build -d --no-deps worker
```

---

## 🗄️ Database Management

### Run Migrations (if using TypeORM migrations)

```bash
docker compose exec backend npx typeorm migration:run -d dist/data-source.js
```

### Backup the Database

```bash
docker compose exec postgres pg_dump -U postgres saas > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore the Database

```bash
docker compose exec -T postgres psql -U postgres saas < backup.sql
```

---

## 🧹 Docker Cleanup

```bash
# Remove stopped containers, unused images, networks, and build cache
docker system prune -a

# Remove only unused volumes (⚠️ deletes DB data if volume is unused)
docker volume prune

# Full nuclear cleanup (removes EVERYTHING including volumes)
docker compose down -v
docker system prune -a --volumes
```

---

## ❓ Troubleshooting

### Backend can't connect to Postgres / Redis

Make sure `.env` uses **Docker service names**, not `localhost`:

```env
DB_HOST=postgres    ✅
DB_HOST=localhost   ❌ (won't work inside Docker network)
REDIS_HOST=redis    ✅
```

### Port already in use

```bash
# Find what's using port 3000
netstat -ano | findstr :3000   # Windows
lsof -i :3000                  # Mac/Linux

# Or change the port in .env
PORT=3001
```

### node_modules conflicts / module not found

```bash
# Remove named volumes to force fresh install
docker compose down -v
docker compose up --build
```

### Frontend shows "API unreachable"

Check that `NEXT_PUBLIC_API_URL` in `.env` points to the correct backend URL:

- **Dev**: `http://localhost:3000`
- **Prod**: `https://api.yourdomain.com`

---

## 🏗️ Architecture Overview

```
Browser
  │
  ▼
[Frontend :4000]
  │  HTTPS / API calls
  ▼
[Backend :3000] ──── [PostgreSQL :5432]
  │                         │
  └── BullMQ Jobs ──► [Redis :6379]
                            │
                       [Worker]
                    (picks up jobs & processes)
```

All containers communicate over the internal `saas_network` Docker bridge network. Only the ports listed above are exposed to the host machine.
