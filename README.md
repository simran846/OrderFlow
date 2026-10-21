# ⚡ OrderFlow: Full-Stack E-Commerce Platform

[![CI Pipeline](https://github.com/simran846/OrderFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/simran846/OrderFlow/actions)
![Node Version](https://img.shields.io/badge/Node.js-v22.x%20LTS-339933?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7%20Strict-3178C6?logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-000000?logo=next.js)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Redis](https://img.shields.io/badge/Redis-7.x%20Alpine-DC382D?logo=redis)
![BullMQ](https://img.shields.io/badge/BullMQ-5.x-CC3534?logo=redis)
![Stripe](https://img.shields.io/badge/Stripe-API%20v17-008CDD?logo=stripe)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker)
![Tests](https://img.shields.io/badge/Tests-58%20Passing-brightgreen?logo=jest)

OrderFlow is an enterprise-grade e-commerce application cleanly decoupled into two independent projects:
1. **`frontend/`**: Modern Next.js 14 customer storefront with App Router, responsive styling, and client-side cart reconciliation.
2. **`backend/`**: Express REST API service with Prisma ORM, MySQL 8, Redis caching, BullMQ background queues, atomic inventory locks, and SHA-256 idempotency protection.

---

## 📁 Repository Structure

```
OrderFlow/
├── frontend/                     # Standalone Next.js 14 Frontend Application
│   ├── public/                   # Static images, favicons, assets
│   ├── src/
│   │   ├── app/                  # Next.js App Router (Catalog, Product, Cart, Checkout, Orders, Auth)
│   │   ├── components/           # Header, Footer, ProductCard
│   │   ├── hooks/                # useAuth, useCart, useToast
│   │   ├── lib/                  # api.ts, utils.ts
│   │   ├── services/             # AuthService, CartService, OrderService, ProductService
│   │   ├── types/                # Domain TypeScript contracts
│   │   └── styles/               # CSS Design System (globals.css)
│   ├── tests/                    # Frontend tests
│   ├── .env.example              # Frontend environment variables template
│   ├── .gitignore
│   ├── next.config.mjs           # Next.js configuration
│   ├── package.json              # Independent frontend dependencies & scripts
│   ├── tsconfig.json             # Independent frontend TypeScript config
│   └── README.md                 # Frontend documentation
│
├── backend/                      # Standalone Express REST API Service
│   ├── prisma/
│   │   ├── schema.prisma         # MySQL 8 Relational Schema
│   │   └── seed.ts               # Database catalog seeder
│   ├── src/
│   │   ├── config/               # Database, Redis, Stripe, Zod env
│   │   ├── controllers/          # HTTP request/response handlers
│   │   ├── docs/                 # OpenAPI 3.0 specification & Swagger UI
│   │   ├── errors/               # Centralized AppError hierarchy
│   │   ├── middleware/           # Auth, RateLimit, Idempotency, RequestLogger, Validation
│   │   ├── queue/                # BullMQ queue producers and background workers
│   │   ├── routes/               # Express API routing tables
│   │   ├── services/             # Core business logic & database transactions
│   │   ├── types/                # TypeScript interfaces, DTOs, and state machine
│   │   ├── utils/                # Pino logger, retry mechanism, cryptography
│   │   ├── validators/           # Zod request validation schemas
│   │   ├── app.ts                # Express application factory
│   │   └── server.ts             # Process lifecycle, graceful shutdown, BullMQ bootstrap
│   ├── tests/
│   │   ├── unit/                 # Domain unit tests (10 test suites, 58 tests)
│   │   ├── integration/          # End-to-end customer lifecycle integration tests
│   │   └── k6/                   # Load testing scripts
│   ├── .env.example              # Backend environment variables template
│   ├── .gitignore
│   ├── jest.config.js            # Jest testing runner config
│   ├── package.json              # Independent backend dependencies & scripts
│   ├── tsconfig.json             # Independent backend TypeScript config
│   └── README.md                 # Backend documentation
│
├── docs/                         # Technical Architecture & API Documentation
│   ├── ARCHITECTURE.md           # System architecture diagrams & design patterns
│   ├── API_GUIDE.md              # REST endpoints & authentication guide
│   └── DEPLOYMENT.md             # Docker & cloud production deployment guide
│
├── infra/                        # Infrastructure Configuration
│   ├── Dockerfile.frontend       # Multi-stage production container for frontend
│   ├── Dockerfile.backend        # Multi-stage production container for backend
│   └── docker-compose.yml        # Full-stack container orchestration
│
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI automated test, lint, and build pipeline
│       └── security-audit.yml    # Automated dependency security audit
│
├── .gitignore                    # Root Git ignore rules
├── .env.example                  # Root environment reference
├── package.json                  # Root convenience scripts runner
└── README.md                     # Project documentation
```

---

## 🚀 Running the Applications Independently

### 1. Backend Setup & Run

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Initialize database schema & seed catalog
npm run deploy:setup

# Start development server on http://localhost:5000
npm run dev

# Run automated test suites (58 tests passing)
npm test

# Build production bundle
npm run build
```

- **API Base URL**: `http://localhost:5000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:5000/api/v1/docs`
- **Health Check**: `http://localhost:5000/api/v1/health`

### 2. Frontend Setup & Run

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start Next.js development server on http://localhost:3000
npm run dev

# Build production bundle
npm run build
```

- **Customer Storefront**: `http://localhost:3000`

---

## 🐳 Docker Compose (Full Stack in Containers)

Run MySQL 8, Redis 7, Backend API, and Frontend Storefront together in isolated containers:

```bash
cd infra
docker compose up --build
```

---

## 🔑 Key Engineering Highlights

1. **Complete Architectural Independence**: `frontend` and `backend` maintain their own `package.json`, `tsconfig.json`, `.env.example`, build commands, and dependencies.
2. **Atomic Inventory Locks**: Backend executes atomic conditional SQL updates in MySQL transactions (`availableStock >= requestedQty`) to guarantee zero overselling.
3. **High-Assurance Idempotency**: Deterministic SHA-256 fingerprinting on checkout requests guarantees zero duplicate credit card charges or double-order creation.
4. **Cryptographic Stripe Webhooks**: Raw request byte buffers are retained to verify HMAC-SHA256 signatures before updating payment and order records.
5. **Server-Authoritative Pricing**: Monetary totals and taxes are calculated exclusively on the server with fixed-point decimal precision.
