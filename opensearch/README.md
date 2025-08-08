# OpenSearch quick start for govdoc-scanner

Minimal steps to index govdoc-scanner results into OpenSearch. For a deep-dive (queries, troubleshooting), see the docs site.

## Data model summary

Template: `opensearch/company-index-template.json`
- Index pattern: `govdoc-companies-*`
- dynamic: false (unknown fields are rejected)
- One document per company (gemi_id)

Mapped fields:
- gemi_id (keyword)
- company_name (text + keyword subfield `raw`)
- company_tax_id (keyword)
- creation_date, scan_date (date)
- registered_address (text + keyword subfield `raw`)
- company_type, competent_gemi_office, region, city, postal_code (keyword)
- document_date (date) – from current snapshot
- tracked_changes_current (text)
- representatives (nested):
  - name (text + keyword subfield `raw`)
  - role (keyword)
  - is_active (boolean)
  - tax_id (keyword)
  - capital_share_text (keyword)
  - capital_share_percent (scaled_float, 2 dp)
  - capital_share_amount_eur (scaled_float, 2 dp)
- tracked_changes_history (nested):
  - file_name (keyword)
  - doc_date (date, strict_date)
  - summary (text)

## 1) Start services (Docker)

```bash
export OPENSEARCH_INITIAL_ADMIN_PASSWORD=yourStrongPassword
# From project root
docker compose up -d opensearch opensearch-dashboards
```

- API: https://localhost:9200 (user: admin, pass: $OPENSEARCH_INITIAL_ADMIN_PASSWORD)
- Dashboards: http://localhost:5601

## 2) Install template and create index

```bash
curl -k -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD \
  -H 'content-type: application/json' \
  -X PUT https://localhost:9200/_index_template/govdoc-companies-template \
  --data-binary @opensearch/company-index-template.json

curl -k -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD \
  -X PUT https://localhost:9200/govdoc-companies-000001
```

## 3) Configure CLI

Copy `.env.example` to `.env` and set:

```bash
OPENSEARCH_PUSH=true
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=yourStrongPassword
OPENSEARCH_INSECURE=true
OPENSEARCH_INDEX=govdoc-companies-000001
```

## 4) Run and push

Interactive (reads OPENSEARCH_*):

```bash
npm start govdoc
```

Or flags (command mode):

```bash
npm start govdoc -- --input ./companies.gds --push \
  --os.endpoint https://localhost:9200 --os.username admin --os.password yourStrongPassword \
  --os.index govdoc-companies-000001 --os.insecure
```

That’s it. Check Dashboards or _search to verify docs.
