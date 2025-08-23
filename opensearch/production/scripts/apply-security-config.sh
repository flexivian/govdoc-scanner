#!/bin/bash

# Script to apply custom security configuration to OpenSearch
# This creates users and roles via REST API instead of securityadmin

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Applying OpenSearch Security Configuration ===${NC}"
echo ""

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found! Run ./setup-security.sh first${NC}"
    exit 1
fi

# Source environment variables
source .env

# Wait for OpenSearch to be ready
echo -e "${YELLOW}Waiting for OpenSearch to be ready...${NC}"
for i in {1..30}; do
    if curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
       "https://localhost:9200/_cluster/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OpenSearch is ready${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ OpenSearch did not become ready${NC}"
        exit 1
    fi
    
    sleep 10
done

echo -e "\n${YELLOW}Creating govdoc_ingest user...${NC}"

# Create the govdoc_ingest user
curl -k -s -X PUT -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
    -H 'Content-Type: application/json' \
    "https://localhost:9200/_plugins/_security/api/internalusers/govdoc_ingest" \
    -d "{\"password\": \"${OPENSEARCH_PROD_GOVDOC_PASSWORD}\", \"backend_roles\": [], \"attributes\": {\"created_by\": \"api\", \"purpose\": \"data-ingestion\"}}" \
    > /tmp/user_response.json

if grep -q "CREATED\|OK" /tmp/user_response.json; then
    echo -e "${GREEN}✓ govdoc_ingest user created/updated${NC}"
else
    echo -e "${RED}✗ Failed to create user${NC}"
    cat /tmp/user_response.json
    exit 1
fi

echo -e "\n${YELLOW}Creating govdoc_ingest_role...${NC}"

# Create the govdoc_ingest_role
curl -k -s -X PUT -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
    -H 'Content-Type: application/json' \
    "https://localhost:9200/_plugins/_security/api/roles/govdoc_ingest_role" \
    -d '{
      "cluster_permissions": [
        "indices:admin/create",
        "cluster:admin/aliases", 
        "cluster:monitor/health",
        "cluster:monitor/stats",
        "indices:data/write/bulk",
        "indices:data/read/mget",
        "indices:data/read/msearch",
        "indices:data/read/mtv"
      ],
      "index_permissions": [
        {
          "index_patterns": ["govdoc-companies-*"],
          "allowed_actions": [
            "write",
            "read",
            "create_index",
            "indices:admin/refresh",
            "indices:admin/rollover"
          ]
        }
      ]
    }' > /tmp/role_response.json

if grep -q "CREATED\|OK" /tmp/role_response.json; then
    echo -e "${GREEN}✓ govdoc_ingest_role created/updated${NC}"
else
    echo -e "${RED}✗ Failed to create role${NC}"
    cat /tmp/role_response.json
    exit 1
fi

echo -e "\n${YELLOW}Mapping role to user...${NC}"

# Map the role to the user
curl -k -s -X PUT -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
    -H 'Content-Type: application/json' \
    "https://localhost:9200/_plugins/_security/api/rolesmapping/govdoc_ingest_role" \
    -d '{"users": ["govdoc_ingest"]}' > /tmp/mapping_response.json

if grep -q "CREATED\|OK" /tmp/mapping_response.json; then
    echo -e "${GREEN}✓ Role mapping created/updated${NC}"
else
    echo -e "${RED}✗ Failed to create role mapping${NC}"
    cat /tmp/mapping_response.json
    exit 1
fi

# Test the govdoc_ingest user
echo -e "\n${YELLOW}Testing govdoc_ingest user authentication...${NC}"

sleep 3  # Wait a bit for changes to take effect

if curl -k -s -u "govdoc_ingest:${OPENSEARCH_PROD_GOVDOC_PASSWORD}" \
   "https://localhost:9200/_cluster/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ govdoc_ingest user can authenticate${NC}"
else
    echo -e "${RED}✗ govdoc_ingest user authentication failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}Security configuration applied successfully!${NC}"
echo -e "${YELLOW}You can now run the initialization script to complete setup.${NC}"
