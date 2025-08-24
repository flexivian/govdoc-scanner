# GovDoc Scanner API

REST API for querying Greek company metadata from GEMI registry scans.

## Quick Start

### Development Setup

1. **Install dependencies:**

```bash
cd api
npm install
```

2. **Configure environment** (create `.env` or set variables):

```bash
# Required
API_KEY=your-secure-api-key-here
API_KEY_ROLE=admin

# Optional
PORT=8080
JWT_SECRET=your-jwt-secret-key
```

3. **Start the API server:**

```bash
npm run dev
```

**API is now running at:** http://localhost:8080

OpenAPI JSON: http://localhost:8080/openapi.json  
Swagger UI: http://localhost:8080/docs

### Quick Test

```bash
# Health check
curl "http://localhost:8080/health"

# Search companies (requires authentication)
curl -H "x-api-key: your-api-key" "http://localhost:8080/companies?q=AKTIS"

# View API documentation
open http://localhost:8080/docs
```

## Authentication

The API supports **dual authentication**:

### API Key (Header)

```bash
curl -H "x-api-key: your-api-key" "http://localhost:8080/companies"
```

### JWT Bearer Token

```bash
# 1. Login to get token
TOKEN=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}' \
  "http://localhost:8080/login" | jq -r '.data.token')

# 2. Use token for requests
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/companies"
```

## Core Endpoints

### Public

- `GET /` - API status
- `GET /health` - Health check with OpenSearch status
- `POST /login` - Login with username/password (returns JWT)

### Company Data (Requires Auth)

- `GET /companies` - Search companies (`?q=term&size=10&from=0`)
- `GET /companies/{gemiId}` - Get specific company
- `GET /companies/representatives` - Search representatives (`?name=term`)

### User Management (Admin Only)

- `GET /users` - List users
- `POST /users` - Create user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `POST /users/{id}/password` - Change password

### Admin (Admin Only)

- `GET /admin/stats` - OpenSearch cluster statistics
- `PUT /admin/index-template/init` - Initialize index template

### Monitoring

- `GET /internal/stats` - API performance metrics
- `GET /metrics` - Prometheus metrics (requires auth)

## Response Format

All responses follow this structure:

```json
{
  "data": {
    /* actual data */
  },
  "meta": {
    "request_id": "uuid",
    "total": 42, // for paginated results
    "from": 0, // pagination offset
    "size": 10 // page size
  }
}
```

Errors return (canonical Error schema):

```json
{
  "error": {
    "code": "error_code",
    "message": "Human readable message",
    "request_id": "uuid",
    "details": {
      /* optional structured info */
    }
  }
}
```

## User Management

### Create Users (Admin)

```bash
curl -X POST -H "x-api-key: admin-key" -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "secure123", "role": "reader"}' \
  "http://localhost:8080/users"
```

### Login Flow

```bash
# Login
curl -X POST -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "secure123"}' \
  "http://localhost:8080/login"
# Returns: {"data": {"token": "jwt...", "role": "reader"}}
```

## Security Features

- **Rate limiting:** 100 requests/minute per IP
- **Input sanitization:** XSS protection on all inputs
- **Role-based access:** Admin vs Reader permissions
- **Request tracking:** All requests logged with unique IDs

## OpenSearch Integration

The API connects to OpenSearch for company data. Configure connection:

```bash
# Environment variables
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=govdoc_ingest
OPENSEARCH_PASSWORD=your-password
OPENSEARCH_INDEX=govdoc-companies-write
OPENSEARCH_INSECURE=true  # for development only
```

**Start OpenSearch first:**

```bash
cd ../opensearch/development
docker compose up -d
```

## Monitoring

### Internal Statistics

```bash
curl -H "x-api-key: your-key" "http://localhost:8080/internal/stats"
```

Returns API uptime, request counts, OpenSearch query performance.

### Prometheus Metrics

```bash
curl -H "x-api-key: your-key" "http://localhost:8080/metrics"
```

Returns standard Node.js metrics in Prometheus format.

## Configuration

| Variable              | Default | Description                |
| --------------------- | ------- | -------------------------- |
| `PORT`                | 8080    | API server port            |
| `API_KEY`             | -       | Primary API key (required) |
| `API_KEY_ROLE`        | admin   | Role for API key users     |
| `JWT_SECRET`          | random  | JWT signing secret         |
| `OPENSEARCH_URL`      | -       | OpenSearch endpoint        |
| `OPENSEARCH_USERNAME` | -       | OpenSearch username        |
| `OPENSEARCH_PASSWORD` | -       | OpenSearch password        |

### Project Structure

```
api/
├── src/
│   ├── server.mjs          # Main server
│   ├── config.mjs          # Configuration
│   ├── plugins/            # Fastify plugins
│   │   ├── auth.mjs        # Authentication
│   │   ├── rate-limit.mjs  # Rate limiting
│   │   └── ...
│   ├── routes/             # API endpoints
│   │   ├── companies/      # Company routes
│   │   ├── admin/          # Admin routes
│   │   └── users.mjs       # User management
│   ├── services/           # Business logic
│   └── schemas/            # JSON schemas
└── package.json
```
