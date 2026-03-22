# Checkout Store

A full-stack e-commerce SPA with integrated payment processing. Built with React + Redux on the frontend and NestJS (Hexagonal Architecture) on the backend.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Redux Toolkit, Vite |
| Backend | NestJS, TypeScript, TypeORM |
| Database | PostgreSQL 16 |
| Architecture | Hexagonal (Ports & Adapters) + Railway Oriented Programming |
| Tests | Jest, React Testing Library |
| Infrastructure | Docker, docker-compose |

---

## Architecture

### Backend – Hexagonal Architecture

```
backend/src/
├── domain/               # Core business logic (no external dependencies)
│   ├── entities/         # Product, Transaction
│   ├── ports/            # Repository & service interfaces
│   └── value-objects/    # Result<T,E> (ROP)
├── application/          # Use Cases (Railway Oriented Programming)
│   └── use-cases/        # GetProducts, CreateTransaction, ProcessPayment
└── infrastructure/       # Adapters (TypeORM, HTTP, Payment Gateway)
    ├── persistence/
    ├── payment-gateway/
    └── http/
```

**Railway Oriented Programming**: All use cases return `Result<T, E>`:
```typescript
type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E }
```

### Frontend – Flux Architecture (Redux Toolkit)

```
frontend/src/
├── store/
│   └── slices/           # productsSlice, checkoutSlice
├── components/           # ProductCard, PaymentModal, PaymentSummary, TransactionResult
├── services/             # API client (axios)
├── types/                # Shared TypeScript types
└── utils/                # Card validation, formatting
```

---

## Data Model

### `products` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `name` | VARCHAR(200) | Product name |
| `description` | TEXT | Product description |
| `price` | BIGINT | Price in COP cents |
| `image_url` | VARCHAR(500) | Product image URL |
| `stock` | INT | Available units |
| `category` | VARCHAR(100) | Product category |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

### `transactions` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `reference` | VARCHAR(100) UNIQUE | Internal reference (TXN-uuid) |
| `product_id` | VARCHAR(36) | FK to products |
| `quantity` | INT | Units purchased |
| `amount_in_cents` | BIGINT | Product subtotal |
| `base_fee_in_cents` | BIGINT | Fixed base fee (3,000 COP) |
| `delivery_fee_in_cents` | BIGINT | Delivery fee (5,000 COP) |
| `total_amount_in_cents` | BIGINT | Total charged |
| `currency` | VARCHAR(10) | Always 'COP' |
| `customer_email` | VARCHAR(200) | Customer email |
| `customer_name` | VARCHAR(200) | Customer full name |
| `customer_phone` | VARCHAR(50) | Customer phone |
| `delivery_address` | VARCHAR(300) | Delivery street address |
| `delivery_city` | VARCHAR(100) | Delivery city |
| `delivery_region` | VARCHAR(100) | Delivery region/dept |
| `delivery_country` | VARCHAR(10) | Country code (CO) |
| `delivery_postal_code` | VARCHAR(20) | Postal code |
| `status` | ENUM | PENDING, APPROVED, DECLINED, VOIDED, ERROR |
| `gateway_transaction_id` | VARCHAR(200) | Payment gateway transaction ID |
| `gateway_status` | VARCHAR(100) | Raw status from gateway |
| `gateway_response` | JSONB | Full gateway response |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

---

## Fee Structure

| Fee | Amount |
|-----|--------|
| Base fee | $3,000 COP (always applied) |
| Delivery fee | $5,000 COP (always applied) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get product by ID |
| POST | `/api/transactions` | Create pending transaction |
| POST | `/api/transactions/:id/pay` | Process payment |
| GET | `/api/transactions/:id` | Get transaction status |

---

## Running Locally

### Prerequisites
- Node.js 22+, npm 10+
- Docker & docker-compose (for PostgreSQL)

### 1. Start PostgreSQL
```bash
docker-compose up postgres -d
```

### 2. Backend
```bash
cd backend
npm install
npm run start:dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173
API runs at: http://localhost:3001/api

---

## Running with Docker
```bash
docker-compose up --build
```

---

## Tests

### Backend
```bash
cd backend
npm test          # run tests
npm run test:cov  # with coverage
```

### Frontend
```bash
cd frontend
npm test          # run tests
npm run test:cov  # with coverage
```

### Backend Coverage Results

```
Test Suites: 11 passed, 11 total
Tests:       50 passed, 50 total

Coverage:
- domain/entities:       100%
- domain/value-objects:  100%
- domain/ports:          100%
- application/use-cases: ~95%
- http/controllers:      100%
- http/filters:          100%
- Overall:               >80%
```

### Frontend Coverage Results

```
Test Suites: 5 passed, 5 total
Tests:       49 passed, 49 total

Coverage:
- utils/card.utils:      100%
- store/slices:          ~97%
- Overall:               97.22% statements
```

---

## Payment Flow

1. User selects product → clicks "Pay with credit card"
2. Credit card form opens → VISA/Mastercard detection + Luhn validation
3. User fills card + delivery info
4. Summary backdrop shows: product amount + base fee + delivery fee
5. User clicks "Pay" →
   - POST `/api/transactions` → creates PENDING record
   - Backend fetches acceptance token from gateway
   - Backend tokenizes card via gateway API
   - Backend creates gateway transaction with integrity signature
   - Backend updates transaction to APPROVED/DECLINED
   - On APPROVED: stock decremented
6. Result screen shown → redirect to store with updated stock

---

## Test Card Numbers (Sandbox)

| Brand | Number | CVC | Expires |
|-------|--------|-----|---------|
| Visa | 4111 1111 1111 1111 | 123 | 08/28 |
| Mastercard | 5500 0000 0000 0004 | 123 | 08/28 |

> All transactions use sandbox mode — no real money.
