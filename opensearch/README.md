# OpenSearch Configuration

This directory contains all OpenSearch-related configurations for the GovDoc Scanner project.

## Directory Structure

```
opensearch/
├── README.md                           # This file - overview of OpenSearch setup
├── development/                        # Development environment configuration
│   ├── docker-compose.yml              # Dev Docker Compose configuration
│   └── .env.template                   # Development environment variables template
├── production/                         # Production environment configuration
│   ├── docker-compose.prod.yml         # Production Docker Compose
│   ├── DEPLOYMENT-GUIDE.md             # Complete production deployment guide
│   ├── config/                         # OpenSearch configuration files
│   │   ├── opensearch.yml              # Main OpenSearch configuration
│   │   ├── jvm.options                 # JVM settings for production
│   │   ├── internal_users.yml          # User authentication configuration
│   │   ├── roles.yml                   # Role definitions
│   │   └── roles_mapping.yml           # User-role mappings
│   ├── scripts/                        # Production automation scripts
│   │   ├── setup-security.sh           # Security initialization script
│   │   ├── initialize-cluster.sh       # Cluster setup script
│   │   ├── health-check.sh             # Health monitoring script
│   │   ├── backup.sh                   # Backup management script
│   │   └── generate-demo-certs.sh      # SSL certificate generation
│   └── certs/                          # SSL certificates
└── shared/                             # Shared resources and documentation
    ├── templates/                      # Common index templates (used by both environments)
    │   └── company-index-template.json # Company data index template
    └── docs/                           # Additional documentation and planning
```

## Quick Start

### Development Environment

```bash
cd opensearch/development
cp .env.template .env
# Edit .env with your strong password (8+ chars, rated "strong" by zxcvbn)
docker compose up -d
```

### Production Environment

```bash
cd opensearch/production
# Run security setup (creates .env file automatically)
./scripts/setup-security.sh
# Start production cluster
docker compose -f docker-compose.prod.yml up -d
# Initialize indices and templates
./scripts/initialize-cluster.sh
```

## Data Model Summary

**Template**: `shared/templates/company-index-template.json`

- **Index pattern**: `govdoc-companies-*`
- **Dynamic mapping**: false (unknown fields rejected)
- **Document structure**: One document per company (gemi_id)

**Key Fields**:

- `gemi_id`, `company_tax_id` (keyword)
- `company_name` (text + keyword subfield)
- `creation_date`, `scan_date`, `document_date` (date)
- `representatives` (nested array)
- `tracked_changes_history` (nested array)

## Environment Differences

| Feature          | Development         | Production               |
| ---------------- | ------------------- | ------------------------ |
| **Memory**       | 512MB heap          | 4GB heap                 |
| **Security**     | Basic auth          | Full TLS + RBAC          |
| **Persistence**  | Docker volumes      | Named volumes + backup   |
| **Monitoring**   | Basic health checks | Comprehensive monitoring |
| **Certificates** | Auto-generated      | Demo certs (Phase 1)     |

## CLI Integration

### Environment Variables (.env)

```bash
OPENSEARCH_PUSH=true
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=yourStrongPassword
OPENSEARCH_INSECURE=true  # For development only
OPENSEARCH_INDEX=govdoc-companies-000001
```

### Usage

```bash
# Interactive mode
npm start govdoc

# Command mode with flags
npm start govdoc -- --input ./companies.gds --push \
  --os.endpoint https://localhost:9200 \
  --os.username admin \
  --os.password yourPassword \
  --os.index govdoc-companies-000001 \
  --os.insecure
```

## Security Notes

### Development

- Uses demo certificates and basic authentication
- `OPENSEARCH_INSECURE=true` for local development
- Password stored in `.env` file (not committed to git)

### Production

- Full TLS encryption for all communication
- Role-based access control (RBAC)
- Strong password policies enforced
- Demo certificates (replace with proper CA-signed certs for full production)

## Access Points

### Development

- **API**: https://localhost:9200 (admin/password)
- **Dashboards**: http://localhost:5601

### Production

- **API**: https://localhost:9200 (admin/production-password)
- **Dashboards**: http://localhost:5601
