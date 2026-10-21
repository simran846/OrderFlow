# ⚡ OrderFlow Backend API

Production-grade e-commerce REST API built with **TypeScript**, **Express**, **MySQL 8**, **Prisma ORM**, **Redis**, and **BullMQ**.

---

## 📁 Architecture Overview

```
backend/
├── prisma/
│   ├── schema.prisma         # MySQL 8 Relational Schema
│   └── seed.ts               # Database catalog seeder
├── src/
│   ├── config/               # Database, Redis, Stripe, Zod env
│   ├── controllers/          # HTTP request/response handlers
│   ├── docs/                 # OpenAPI 3.0 specification & Swagger UI
│   ├── errors/               # Centralized AppError hierarchy
│   ├── middleware/           # Auth, RateLimit, Idempotency, RequestLogger, Validation
│   ├── queue/                # BullMQ queue producers and background workers
│   ├── routes/               # Express API routing tables
│   ├── services/             # Core business logic & database transactions
│   ├── types/                # TypeScript interfaces, DTOs, and state machine
│   ├── utils/                # Pino logger, retry mechanism, cryptography
│   ├── validators/           # Zod request validation schemas
│   ├── app.ts                # Express application factory
│   └── server.ts             # Process lifecycle, graceful shutdown, BullMQ bootstrap
├── tests/
│   ├── unit/                 # Domain unit tests
│   ├── integration/          # End-to-end customer lifecycle integration tests
│   └── k6/                   # Load testing scripts
├── .env.example              # Environment variables template
├── .gitignore
├── jest.config.js            # Jest testing runner config
├── package.json
└── tsconfig.json
```

---

## 🚀 Quickstart & Commands

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Setup environment configuration
cp .env.example .env

# 4. Synchronize Prisma schema with MySQL & seed initial catalog
npm run deploy:setup

# 5. Start development server with live reload (port 5000)
npm run dev

# 6. Run automated test suites (10 suites, 58 tests)
npm test

# 7. Compile production bundle
npm run build

# 8. Start production server
npm start
```

---

## 🌐 API Endpoints

Interactive Swagger UI is accessible at [http://localhost:5000/api/v1/docs](http://localhost:5000/api/v1/docs).
Health check endpoint is at [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health).
