# 🛍️ OrderFlow Frontend Application

Modern, responsive customer storefront built with **Next.js 14**, **React 18**, and **TypeScript**. Inspired by world-class consumer marketplaces (Amazon, Flipkart, and Swiggy).

---

## 📁 Architecture Overview

```
frontend/
├── public/                   # Favicons, icons, and static assets
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Global Layout with Header, Footer, and Context Providers
│   │   ├── page.tsx          # Storefront Homepage, Deals Banner, Product Grid
│   │   ├── product/[id]/     # Product Detail View
│   │   ├── cart/             # Shopping Cart with Real-time Calculations
│   │   ├── checkout/         # Idempotent Checkout & Address Form
│   │   ├── orders/           # Customer Order History
│   │   ├── orders/[id]/      # Order Confirmation & Invoice Receipt
│   │   ├── login/            # Customer Sign In
│   │   ├── signup/           # Customer Registration
│   │   └── account/          # Customer Profile & Preferences
│   ├── components/           # Header, Footer, ProductCard
│   ├── hooks/                # useAuth, useCart, useToast
│   ├── lib/                  # api.ts, utils.ts
│   ├── services/             # AuthService, ProductService, CartService, OrderService
│   ├── types/                # Domain TypeScript contracts
│   └── styles/               # CSS Design System (globals.css)
├── tests/                    # Frontend tests
├── .env.example              # Frontend environment configuration template
├── .gitignore
├── next.config.mjs           # Next.js build configuration
├── package.json
└── tsconfig.json
```

---

## 🚀 Quickstart & Commands

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Setup environment configuration
cp .env.example .env.local

# 4. Start Next.js development server (port 3000)
npm run dev

# 5. Compile production bundle
npm run build

# 6. Start production server
npm start
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the OrderFlow Backend REST API | `http://localhost:5000/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | Public branding name | `OrderFlow Express Marketplace` |
