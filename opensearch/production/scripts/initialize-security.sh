#!/bin/bash

# Script to initialize OpenSearch security configuration using securityadmin.sh
# This must be run after OpenSearch is started but before using the REST API for security

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Initializing OpenSearch Security Configuration ===${NC}"
echo ""

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found! Run ./scripts/setup-security.sh first${NC}"
    exit 1
fi

# Source environment variables
source .env

# Wait for OpenSearch to be ready (basic health check)
echo -e "${YELLOW}Waiting for OpenSearch to be ready...${NC}"
for i in {1..30}; do
    if docker exec govdoc-opensearch-production curl -k -s "https://localhost:9200/_cluster/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OpenSearch is ready${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ OpenSearch did not become ready${NC}"
        exit 1
    fi
    
    sleep 10
done

echo -e "\n${YELLOW}Initializing security configuration using securityadmin.sh...${NC}"

# Run securityadmin.sh inside the OpenSearch container to initialize security
docker exec govdoc-opensearch-production \
    /usr/share/opensearch/plugins/opensearch-security/tools/securityadmin.sh \
    -cd /usr/share/opensearch/config/opensearch-security/ \
    -icl \
    -nhnv \
    -cacert /usr/share/opensearch/config/certs/root-ca.pem \
    -cert /usr/share/opensearch/config/certs/admin.pem \
    -key /usr/share/opensearch/config/certs/admin-key.pem

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Security configuration initialized successfully${NC}"
else
    echo -e "${RED}✗ Failed to initialize security configuration${NC}"
    exit 1
fi

# Test the admin user
echo -e "\n${YELLOW}Testing admin user authentication...${NC}"

sleep 3  # Wait a bit for changes to take effect

if curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
   "https://localhost:9200/_cluster/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Admin user can authenticate${NC}"
else
    echo -e "${RED}✗ Admin user authentication failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}Security initialization completed successfully!${NC}"
echo -e "${YELLOW}You can now run the cluster initialization script to continue setup.${NC}"
