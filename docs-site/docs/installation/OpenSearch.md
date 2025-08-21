# OpenSearch Integration

This guide shows how to set up, configure, and use OpenSearch 3.1+ integration with govdoc-scanner.

## What you get

- Searchable index of company metadata (one document per GEMI ID)
- Nested representatives and tracked changes history
- Keyword subfields for aggregations and exact matching
- CLI push support with flags or environment variables

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (20+ recommended)

## Start OpenSearch locally

From the project root:

```bash
# Ensure OPENSEARCH_INITIAL_ADMIN_PASSWORD is set in your .env
# Password must be at least 8 characters and rated as "strong" by zxcvbn
# Use a complex password like: MyStr0ngP@ssw0rd123!
export OPENSEARCH_INITIAL_ADMIN_PASSWORD=MyStr0ngP@ssw0rd123!

# Start OpenSearch + Dashboards
docker compose up -d opensearch opensearch-dashboards
```

OpenSearch:

- API: https://localhost:9200 (user: admin, password: $OPENSEARCH_INITIAL_ADMIN_PASSWORD)
- Dashboards: http://localhost:5601

Note: OpenSearch 3.1+ requires strong passwords (8+ chars, rated "strong" by zxcvbn). Self-signed SSL is enabled by default.

## Install the index template

Load the provided template so your index has the correct mappings:

```bash
# Using curl (replace password)
curl -k -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD \
  -H 'content-type: application/json' \
  -X PUT https://localhost:9200/_index_template/govdoc-companies-template \
  --data-binary @opensearch/company-index-template.json

# Create the first write index (if not exists)
curl -k -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD -X PUT https://localhost:9200/govdoc-companies-000001
```

## Configure the CLI

Copy the example env and set values:

```bash
cp .env.example .env
```

Update or ensure these keys exist in `.env`:

```bash
# Enable push in interactive mode
OPENSEARCH_PUSH=true

# Connection
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=yourStrongPassword
OPENSEARCH_INSECURE=true # accept self-signed certs in dev

# Indexing
OPENSEARCH_INDEX=govdoc-companies-000001
OPENSEARCH_INDEX_STRATEGY=static   # or by-year
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_REFRESH=false
```

## Index data

Run the CLI and let it push automatically (interactive mode reads OPENSEARCH_PUSH=true):

```bash
npm start govdoc
```

Or run in command mode and force push with flags:

```bash
npm start govdoc -- --input ./companies.gds \
  --push \
  --os.endpoint https://localhost:9200 \
  --os.username admin \
  --os.password yourStrongPassword \
  --os.index govdoc-companies-000001 \
  --os.index-strategy static \
  --os.insecure \
  --os.batch-size 500 \
  --os.refresh
```

The CLI will print a summary like:

```
📤 Pushing to OpenSearch...
✅ Indexed: 42 | ❌ Failed: 0
```

## Query examples

Search by company name:

```json
POST govdoc-companies-000001/_search
{
  "query": {
    "match": { "company_name": "ΤΕΧΝΙΚΗ" }
  }
}
```

Filter by region and aggregate cities:

```json
POST govdoc-companies-000001/_search
{
  "size": 0,
  "query": {
    "term": { "region": "ΑΤΤΙΚΗΣ" }
  },
  "aggs": {
    "cities": { "terms": { "field": "city" } }
  }
}
```

Find active representatives named "ΓΕΩΡΓΙΟΣ":

```json
POST govdoc-companies-000001/_search
{
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
}
```

## Troubleshooting

- Indexed count is 0:
  - Ensure index template is installed and index exists
  - Confirm docs are in the final output set (CLI filters to successful ones)
  - Check OPENSEARCH_INDEX_STRATEGY; with by-year, docs go to e.g. govdoc-companies-2021
- SSL errors:
  - Use `OPENSEARCH_INSECURE=true` or `--os.insecure` locally
- Auth errors:
  - Verify username/password and OPENSEARCH_URL

## Mapping and rationale

See `opensearch/company-index-template.json` and `opensearch/README.md` for detailed field mappings and reasoning.
