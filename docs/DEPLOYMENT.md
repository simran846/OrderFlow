# 🚀 OrderFlow Deployment & Infrastructure Guide

This guide covers running OrderFlow locally, spinning up Docker containers, and deploying to cloud platforms (Render, Railway, AWS).

---

## 1. Local Development (Monorepo Workspaces)

### Prerequisites
- Node.js 20+ LTS or 22+
- MySQL 8.0 running locally on port 3306 (or via Docker)
- Redis 7 running on port 6379 (or via Docker)

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/simran846/OrderFlow.git
   cd OrderFlow
   ```
2. Install all monorepo dependencies:
   ```bash
   npm install
   ```
3. Prepare environment variables:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```
4. Synchronize database schema and seed the catalog:
   ```bash
   npm run deploy:setup
   ```
5. Run the services:
   ```bash
   # Run Backend API (http://localhost:5000)
   npm run dev:api

   # In a separate terminal, run Frontend Storefront (http://localhost:3000)
   npm run dev:web
   ```

---

## 2. Docker Compose Quickstart

Run the full stack (MySQL 8, Redis 7, Backend API, and Next.js Storefront) with a single command:

```bash
docker compose up --build
```

Access points:
- **Next.js Web Storefront**: [http://localhost:3000](http://localhost:3000)
- **Express REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Interactive Swagger Docs**: [http://localhost:5000/api/v1/docs](http://localhost:5000/api/v1/docs)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 3. Render Deployment

OrderFlow includes a native Render blueprint located at `infra/render/render.yaml` (and mirrored at root `render.yaml`).

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the services:
   - `orderflow-api` (Node web service running `npm run start -w @orderflow/api`)
   - `orderflow-web` (Node web service running `npm run start -w @orderflow/web`)
5. Provide your managed MySQL connection URL for `DATABASE_URL` and optional Redis URL for `REDIS_URL`.
