# 📚 OrderFlow REST API Guide

OrderFlow exposes a fully documented, production-ready REST API at `http://localhost:5000/api/v1`.

Interactive Swagger UI documentation is available at `/api/v1/docs`.
OpenAPI 3.0 specification is available in raw JSON at `/api/v1/docs/json`.

---

## 1. Authentication & Security

All authenticated endpoints require a Bearer token in the HTTP Authorization header:
```http
Authorization: Bearer <your_jwt_access_token>
```

### Auth Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Create customer account & returns tokens | No |
| `POST` | `/api/v1/auth/login` | Authenticate customer & returns tokens | No |
| `POST` | `/api/v1/auth/refresh` | Refresh access token using refresh token | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Yes |

---

## 2. Product Catalog

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | List all product categories | - |
| `GET` | `/api/v1/products` | Paginated product listing | `page`, `limit`, `categoryId`, `search`, `sortBy`, `sortOrder` |
| `GET` | `/api/v1/products/:id` | Fetch single product details | - |
| `POST` | `/api/v1/products` | Create product | Admin only |
| `PUT` | `/api/v1/products/:id` | Update product details | Admin only |
| `DELETE`| `/api/v1/products/:id` | Delete product | Admin only |

---

## 3. Shopping Cart

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/cart` | Get current user's shopping cart | Yes |
| `POST` | `/api/v1/cart/items` | Add item to cart (`{ productId, quantity }`) | Yes |
| `PUT` | `/api/v1/cart/items/:productId` | Update cart item quantity (`{ quantity }`) | Yes |
| `DELETE`| `/api/v1/cart/items/:productId` | Remove item from cart | Yes |
| `DELETE`| `/api/v1/cart` | Clear entire shopping cart | Yes |

---

## 4. Orders & Idempotent Checkout

### Checkout Request
```http
POST /api/v1/orders/checkout HTTP/1.1
Host: localhost:5000
Authorization: Bearer <token>
Idempotency-Key: idemp_abc12345_179256
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "John Doe",
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "Oregon",
    "postalCode": "97477",
    "phone": "+1 (555) 019-2834"
  }
}
```

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/orders/checkout` | Atomically reserve stock and place order | Yes (requires `Idempotency-Key`) |
| `GET` | `/api/v1/orders` | List user's orders (or all orders for Admin) | Yes |
| `GET` | `/api/v1/orders/:id` | Get order details & line items | Yes |
| `POST` | `/api/v1/orders/:id/cancel` | Cancel order & release reserved stock | Yes |

---

## 5. Payments & Webhooks

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/payments/create-intent` | Initialize Stripe PaymentIntent for order | Yes |
| `POST` | `/api/v1/payments/webhook` | Stripe HMAC-signed webhook callback handler | Stripe Signature |

---

## 6. Health & Monitoring

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service liveness health check |
| `GET` | `/api/v1/health/ready` | Readiness check verifying MySQL & Redis connections |
