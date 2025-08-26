# OpenSearch Integration

This guide shows how to set up and use OpenSearch 3.1+ with govdoc-scanner for searchable company data indexing.

## Overview

The `apps/opensearch/` directory provides complete OpenSearch integration with:

- **Development environment**: Quick local setup for testing
- **Production environment**: Secure, scalable deployment with authentication
- **Index templates**: Pre-configured mappings for company data
- **Dashboard setup**: Ready-to-use visualizations and index patterns

## What You Get

- Searchable index of company metadata (one document per GEMI ID)
- Nested representatives and tracked changes history
- Keyword subfields for aggregations and exact matching
- CLI integration with bulk push support
- OpenSearch Dashboards for data exploration

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (20+ recommended)

## Development Setup

For local development and testing:

### 1. Start Development Cluster

```bash
cd apps/opensearch/development
cp .env.template .env
# Edit .env with a strong password (8+ characters)
docker compose up -d
```

### 2. Configure Application

Update your root `.env` file:

```bash
OPENSEARCH_PUSH=true
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=yourAdminPassword
OPENSEARCH_INSECURE=true
OPENSEARCH_INDEX=govdoc-companies-000001
```

### 3. Create Index Template

```bash
curl -k -u admin:yourAdminPassword -X PUT "https://localhost:9200/_index_template/govdoc-company-template" \
  -H "Content-Type: application/json" \
  -d @apps/opensearch/shared/templates/company-index-template.json
```

### 4. Create Initial Index

```bash
curl -k -u admin:yourAdminPassword -X PUT "https://localhost:9200/govdoc-companies-000001"
```

**Verify setup:**

```bash
# Check if template was created
curl -k -u admin:yourAdminPassword "https://localhost:9200/_index_template/govdoc-company-template?pretty"

# Check index mappings
curl -k -u admin:yourAdminPassword "https://localhost:9200/govdoc-companies-000001/_mapping?pretty"
```

### 5. Test Data Ingestion

```bash
npm start govdoc -- --input ./companies.gds --push
```

### Access Dashboards

- **URL**: http://localhost:5601
- **Username**: admin
- **Password**: (from your `.env` file)

Create index patterns manually:

1. Go to **Discover -> Create Index Pattern**
2. Create pattern: `govdoc-companies-*`
3. Set time field: `scan_date`
4. Explore data in **Discover** tab

**Shut Down Docker Container:**

```bash
cd apps/opensearch/development
docker compose down
```

**Reset development environment:**

```bash
cd apps/opensearch/development
docker compose down --volumes --remove-orphans
```

## Production Setup

For production deployments with security and monitoring:

### Quick Setup

```bash
cd apps/opensearch/production
./setup-production.sh
```

This automatically:

1. Generates secure passwords and certificates
2. Creates security configuration (users, roles, mappings)
3. Starts production OpenSearch cluster
4. Initializes security configuration with proper authentication
5. Creates test data to verify bulk operations work

**Important**: After setup completes, passwords are stored in `/apps/opensearch/production/.env`. Copy the `govdoc_ingest` password to your root `.env` file.

### Manual Setup

For step-by-step control:

```bash
cd apps/opensearch/production
# Step 1: Run security setup (creates .env file automatically)
./scripts/setup-security.sh
# Step 2: Start production cluster
docker compose -f docker-compose.prod.yml up -d
# Step 3: Initialize security configuration (loads YAML files into OpenSearch)
./scripts/initialize-security.sh
# Step 4: Initialize indices and templates
./scripts/initialize-cluster.sh
# Step 5: Setup dashboards
./scripts/setup-dashboards.sh
```

**Security Note**: Production uses a dedicated `govdoc_ingest` user with minimal permissions (only bulk write access to `govdoc-companies-*` indexes). Admin credentials are separate and should be stored securely.

**Shut Down Docker Container:**

```bash
cd apps/opensearch/production
docker compose -f docker-compose.prod.yml down
```

**Reset production environment:**

```bash
cd apps/opensearch/production
./cleanup-production.sh
```

### Production Maintenance

#### Health Monitoring

Check cluster health and status:

```bash
cd apps/opensearch/production
./scripts/health-check.sh
```

This script monitors:

- Cluster status (green/yellow/red) with shard distribution
- Node health, heap memory usage, and JVM statistics
- Index statistics and document counts for govdoc-companies-\* indices
- Disk usage (both container and host)
- Recent snapshot status and backup health
- Security configuration (HTTPS and authentication status)

#### Data Backup

Create backups of your data:

```bash
cd apps/opensearch/production
./scripts/backup.sh
```

Features:

- Creates timestamped snapshots (govdoc-daily-YYYYMMDD-HHMMSS)
- Backs up govdoc-companies-\* indices with metadata
- Automatic cleanup of old snapshots (30-day retention)
- Repository verification and integrity checks
- Progress monitoring and detailed reporting
- Support for --list-only, --cleanup-only, --verify-only options

### Access Production Dashboards

- **URL**: http://localhost:5601
- **Username**: admin
- **Password**: (shown after setup completion)

Index patterns are automatically created. You can:

- Explore data in **Discover**
- Create visualizations in **Visualize**
- Build dashboards in **Dashboard**
- Monitor health in **Stack Management**

## Environment Differences

| Feature          | Development         | Production                 |
| ---------------- | ------------------- | -------------------------- |
| **Memory**       | 512MB heap          | 4GB heap                   |
| **Security**     | Basic auth          | Full TLS + RBAC            |
| **Persistence**  | Docker volumes      | Named volumes + backup     |
| **Monitoring**   | Basic health checks | Health checks + monitoring |
| **Certificates** | Auto-generated      | Demo certs                 |

## CLI Integration

### Environment Variables

Configure in your root `.env`:

```bash
OPENSEARCH_PUSH=true
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin         # Development
# OPENSEARCH_USERNAME=govdoc_ingest  # Production
OPENSEARCH_PASSWORD=yourPassword
OPENSEARCH_INDEX=govdoc-companies-write  # Or govdoc-companies-000001
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_INSECURE=true  # For development/demo certificates only
```

### Interactive Mode

```bash
npm start govdoc
# Automatically pushes if OPENSEARCH_PUSH=true
```

### Command Mode with Flags

```bash
# Development
npm start govdoc -- --input ./companies.gds \
  --push \
  --os.endpoint https://localhost:9200 \
  --os.username admin \
  --os.password yourDevPassword \
  --os.index govdoc-companies-000001 \
  --os.insecure \
  --os.batch-size 500

# Production
npm start govdoc -- --input ./companies.gds \
  --push \
  --os.endpoint https://localhost:9200 \
  --os.username govdoc_ingest \
  --os.password yourProdPassword \
  --os.index govdoc-companies-write \
  --os.insecure \
  --os.batch-size 500
```

## Data Model

The index template (`apps/opensearch/shared/templates/company-index-template.json`) defines:

- **Index pattern**: `govdoc-companies-*`
- **Dynamic mapping**: false (unknown fields rejected)
- **Document structure**: One document per company (gemi_id)

**Key Fields**:

- `gemi_id`, `company_tax_id` (keyword)
- `company_name` (text + keyword subfield)
- `creation_date`, `scan_date`, `document_date` (date)
- `representatives` (nested array)
- `tracked_changes_history` (nested array with `company_changes`, `economic_changes` per document)

## Query Examples

### Search by company name:

```bash
curl -k -u admin:yourPassword -X POST "https://localhost:9200/govdoc-companies-000001/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "company_name": "ΤΕΧΝΙΚΗ" }
    }
  }'
```

### Filter by region and aggregate cities:

```bash
curl -k -u admin:yourPassword -X POST "https://localhost:9200/govdoc-companies-000001/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "size": 0,
    "query": {
      "term": { "region": "ΑΤΤΙΚΗΣ" }
    },
    "aggs": {
      "cities": { "terms": { "field": "city" } }
    }
  }'
```

### Find active representatives:

```bash
curl -k -u admin:yourPassword -X POST "https://localhost:9200/govdoc-companies-000001/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "nested": {
        "path": "representatives",
        "query": {
          "bool": {
            "must": [
              { "match": { "representatives.name": "ΓΕΩΡΓΙΟΣ" } },
              { "term": { "representatives.is_active": true } }
            ]
          }
        }
      }
    }
  }'
```

## Directory Structure

```
apps/opensearch/
├── README.md                           # Quick start guide
├── development/                        # Development environment
│   ├── docker-compose.yml              # Dev Docker Compose
│   └── .env.template                   # Environment template
├── production/                         # Production environment
│   ├── docker-compose.prod.yml         # Production Docker Compose
│   ├── setup-production.sh             # One-click setup script
│   ├── cleanup-production.sh           # Reset script
│   ├── config/                         # OpenSearch configuration
│   └── scripts/                        # Setup automation scripts
└── shared/                             # Shared resources
    └── templates/                      # Index templates
        └── company-index-template.json # Company data mapping
```
