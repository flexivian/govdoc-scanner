# GovDoc Scanner API

REST API for querying Greek company metadata from GEMI registry scans.

## Prerequisites

**Ensure OpenSearch Production is running first:**

```bash
cd ../opensearch/production
./setup-production.sh
```

## Development Deployment

For development and testing with OpenSearch integration:

### Quick Development Setup

```bash
cd api
# Setup environment file
./docker-deploy.sh setup
# Edit .env with your configuration (use govdoc_ingest credentials)
nano .env
# Build and start development services
./docker-deploy.sh build dev
./docker-deploy.sh start dev
```

### Development Features

- **Network**: Connected to OpenSearch production network
- **Port**: Accessible on all interfaces (`0.0.0.0:8080`)
- **Logging**: Info level logs
- **Resources**: 512M memory limit
- **Security**: Basic security settings

### Development Commands

```bash
./docker-deploy.sh build dev      # Build development image
./docker-deploy.sh start dev      # Start development services
./docker-deploy.sh stop dev       # Stop development services
./docker-deploy.sh logs dev [-f]  # View development logs
./docker-deploy.sh status dev     # Show development status
```

## Production Deployment

For production deployment with enhanced security and performance:

### Quick Production Setup

```bash
cd api
# Setup environment file (if not done)
./docker-deploy.sh setup
# Edit .env with production configuration
nano .env
# Full production deployment
./docker-deploy.sh deploy
```

### Production Features

- **Network**: Connected to OpenSearch production network + internal network
- **Port**: Only accessible from localhost (`127.0.0.1:8080`) - requires reverse proxy
- **Logging**: Warn level logs with rotation
- **Resources**: 1G memory limit, enhanced CPU allocation
- **Security**: Enhanced security (dropped capabilities, read-only filesystem)
- **Monitoring**: Production labels and structured logging

### Production Commands

```bash
./docker-deploy.sh build prod     # Build production image
./docker-deploy.sh start prod     # Start production services
./docker-deploy.sh stop prod      # Stop production services
./docker-deploy.sh logs prod [-f] # View production logs
./docker-deploy.sh status prod    # Show production status
./docker-deploy.sh deploy         # Full deployment (build + start production)
```

### Production Access

- **API Endpoint**: http://localhost:8080 (localhost only)
- **For external access**: Setup reverse proxy (nginx/traefik)
- **Health Check**: `curl http://localhost:8080/health`

## General Commands

- `./docker-deploy.sh setup` - Create .env from template
- `./docker-deploy.sh status` - Show container status
- `./docker-deploy.sh cleanup` - Clean up containers and images

**API Documentation:**

- OpenAPI JSON: http://localhost:8080/openapi.json
- Swagger UI: http://localhost:8080/docs

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
