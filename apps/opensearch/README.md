# OpenSearch Configuration

This directory contains all OpenSearch-related configurations for the GovDoc Scanner project.

**Detailed Guide**: [OpenSearch Installation Documentation](https://flexivian.github.io/govdoc-scanner/docs/installation/OpenSearch)

## Quick Start

### Development Environment

1. **Start OpenSearch development cluster:**

```bash
cd apps/opensearch/development
cp .env.template .env
# Edit .env with a strong password (8+ characters)
docker compose up -d
```

2. **Configure your application** by updating the root `.env` file:

```bash
OPENSEARCH_PUSH=true
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=yourAdminPassword
OPENSEARCH_INSECURE=true
OPENSEARCH_INDEX=govdoc-companies-000001
```

3. **Create the index template:**

```bash
curl -k -u admin:eYTYXHS1234! -X PUT "https://localhost:9200/_index_template/govdoc-company-template" \
  -H "Content-Type: application/json" \
  -d @../shared/templates/company-index-template.json
```

4. **Create the initial index:**

```bash
curl -k -u admin:eYTYXHS1234! -X PUT "https://localhost:9200/govdoc-companies-000001"
```

**Verify setup:**

```bash
# Check if template was created
curl -k -u admin:eYTYXHS1234! "https://localhost:9200/_index_template/govdoc-company-template?pretty"

# Check index mappings
curl -k -u admin:eYTYXHS1234! "https://localhost:9200/govdoc-companies-000001/_mapping?pretty"
```

5. **Test data ingestion:**

```bash
npm start govdoc -- --input ./companies.gds --push
```

**Access OpenSearch Dashboards:**

- **URL**: http://localhost:5601
- **Username**: admin
- **Password**: (from your `.env` file)

Create index patterns and visualizations:

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

## Production Environment

### Quick Production Setup

```bash
cd apps/opensearch/production
# Run the unified production setup script
./setup-production.sh
```

This script will automatically:

1. Generate secure passwords and certificates
2. Start the production OpenSearch cluster
3. Initialize security configuration (create users and roles)
4. Initialize indices, templates, and aliases
5. Setup OpenSearch Dashboards index patterns

### Manual Step-by-Step Setup

If you prefer to run each step manually:

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

**Configure your application** by copying from the .env created to the root `.env` file:

```bash
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=govdoc_ingest
OPENSEARCH_PASSWORD=govdoc_ingest_password
OPENSEARCH_INDEX=govdoc-companies-write
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_INSECURE=true  # Set to false when using proper certificates
```

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

**Access OpenSearch Dashboards:**

- **URL**: http://localhost:5601
- **Username**: admin
- **Password**: (shown after running setup script)

The production setup automatically creates index patterns. You can:

1. Access **Discover** to explore company data
2. Create visualizations in **Visualize**
3. Build dashboards in **Dashboard**
4. Monitor cluster health in **Stack Management**
