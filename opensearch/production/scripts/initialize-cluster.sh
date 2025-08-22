#!/bin/bash

# Production Initialization Script for GovDoc Scanner OpenSearch
# This script initializes the production cluster with proper index templates and aliases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENSEARCH_URL="https://localhost:9200"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")/config"
TEMPLATE_FILE="../company-index-template.json"

echo -e "${BLUE}=== GovDoc Scanner - Production Cluster Initialization ===${NC}"
echo ""

# Check if environment file exists
if [ ! -f "../production.env" ]; then
    echo -e "${RED}Error: production.env file not found!${NC}"
    echo -e "${YELLOW}Run ./setup-security.sh first${NC}"
    exit 1
fi

# Source environment variables
source ../production.env

# Function to wait for OpenSearch to be ready
wait_for_opensearch() {
    echo -e "${YELLOW}Waiting for OpenSearch to be ready...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
           "${OPENSEARCH_URL}/_cluster/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OpenSearch is ready${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt ${attempt}/${max_attempts} - waiting...${NC}"
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}Error: OpenSearch did not become ready${NC}"
    exit 1
}

# Function to check cluster health
check_cluster_health() {
    echo -e "\n${YELLOW}Checking cluster health...${NC}"
    
    local health_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                           "${OPENSEARCH_URL}/_cluster/health")
    
    local status=$(echo "$health_response" | jq -r '.status' 2>/dev/null || echo "unknown")
    
    case $status in
        "green")
            echo -e "${GREEN}✓ Cluster status: GREEN (healthy)${NC}"
            ;;
        "yellow")
            echo -e "${YELLOW}⚠ Cluster status: YELLOW (functional but degraded)${NC}"
            ;;
        "red")
            echo -e "${RED}✗ Cluster status: RED (unhealthy)${NC}"
            echo "Health response: $health_response"
            ;;
        *)
            echo -e "${RED}✗ Unable to determine cluster status${NC}"
            echo "Health response: $health_response"
            ;;
    esac
}

# Function to install index template
install_index_template() {
    echo -e "\n${YELLOW}Installing GovDoc companies index template...${NC}"
    
    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
        exit 1
    fi
    
    local response=$(curl -k -s -w "%{http_code}" -o /tmp/template_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -X PUT "${OPENSEARCH_URL}/_index_template/govdoc-companies-template" \
                    --data-binary "@${TEMPLATE_FILE}")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Index template installed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to install index template (HTTP $response)${NC}"
        cat /tmp/template_response.json
        exit 1
    fi
}

# Function to create initial index
create_initial_index() {
    echo -e "\n${YELLOW}Creating initial index...${NC}"
    
    local response=$(curl -k -s -w "%{http_code}" -o /tmp/index_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -X PUT "${OPENSEARCH_URL}/govdoc-companies-000001")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Initial index created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create initial index (HTTP $response)${NC}"
        cat /tmp/index_response.json
        exit 1
    fi
}

# Function to setup aliases
setup_aliases() {
    echo -e "\n${YELLOW}Setting up index aliases...${NC}"
    
    local alias_config='{
        "actions": [
            {
                "add": {
                    "index": "govdoc-companies-000001",
                    "alias": "govdoc-companies-write",
                    "is_write_index": true
                }
            },
            {
                "add": {
                    "index": "govdoc-companies-000001",
                    "alias": "govdoc-companies"
                }
            }
        ]
    }'
    
    local response=$(curl -k -s -w "%{http_code}" -o /tmp/alias_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -X POST "${OPENSEARCH_URL}/_aliases" \
                    -d "$alias_config")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Index aliases configured successfully${NC}"
        echo -e "  • govdoc-companies-write (write alias)"
        echo -e "  • govdoc-companies (read alias)"
    else
        echo -e "${RED}✗ Failed to setup aliases (HTTP $response)${NC}"
        cat /tmp/alias_response.json
        exit 1
    fi
}

# Function to setup backup repository
setup_backup_repository() {
    echo -e "\n${YELLOW}Setting up backup repository...${NC}"
    
    local repo_config='{
        "type": "fs",
        "settings": {
            "location": "/usr/share/opensearch/backup",
            "compress": true,
            "max_snapshot_bytes_per_sec": "50mb",
            "max_restore_bytes_per_sec": "50mb"
        }
    }'
    
    local response=$(curl -k -s -w "%{http_code}" -o /tmp/repo_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -X PUT "${OPENSEARCH_URL}/_snapshot/govdoc-backup-repo" \
                    -d "$repo_config")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Backup repository configured successfully${NC}"
    else
        echo -e "${RED}✗ Failed to setup backup repository (HTTP $response)${NC}"
        cat /tmp/repo_response.json
        exit 1
    fi
}

# Function to test application user access
test_application_access() {
    echo -e "\n${YELLOW}Testing application user access...${NC}"
    
    # Test cluster health access
    local health_response=$(curl -k -s -w "%{http_code}" -o /tmp/user_health_response.json \
                           -u "govdoc_ingest:${OPENSEARCH_PROD_GOVDOC_PASSWORD}" \
                           "${OPENSEARCH_URL}/_cluster/health")
    
    if [ "$health_response" = "200" ]; then
        echo -e "${GREEN}✓ Application user can access cluster health${NC}"
    else
        echo -e "${RED}✗ Application user cannot access cluster health${NC}"
        cat /tmp/user_health_response.json
    fi
    
    # Test index access
    local index_response=$(curl -k -s -w "%{http_code}" -o /tmp/user_index_response.json \
                          -u "govdoc_ingest:${OPENSEARCH_PROD_GOVDOC_PASSWORD}" \
                          "${OPENSEARCH_URL}/govdoc-companies/_count")
    
    if [ "$index_response" = "200" ]; then
        echo -e "${GREEN}✓ Application user can access index${NC}"
    else
        echo -e "${YELLOW}⚠ Application user cannot access index (expected until data is indexed)${NC}"
    fi
}

# Function to display summary
display_summary() {
    echo -e "\n${GREEN}=== Initialization Complete ===${NC}"
    echo ""
    echo -e "${BLUE}Cluster Information:${NC}"
    echo -e "  • OpenSearch URL: ${OPENSEARCH_URL}"
    echo -e "  • Admin Username: admin"
    echo -e "  • Application Username: govdoc_ingest"
    echo ""
    echo -e "${BLUE}Index Information:${NC}"
    echo -e "  • Write Index: govdoc-companies-write"
    echo -e "  • Read Alias: govdoc-companies"
    echo -e "  • Physical Index: govdoc-companies-000001"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Update your application .env file:"
    echo -e "     OPENSEARCH_URL=${OPENSEARCH_URL}"
    echo -e "     OPENSEARCH_USERNAME=govdoc_ingest"
    echo -e "     OPENSEARCH_PASSWORD=${OPENSEARCH_PROD_GOVDOC_PASSWORD}"
    echo -e "     OPENSEARCH_INDEX=govdoc-companies-write"
    echo ""
    echo -e "  2. Test data ingestion:"
    echo -e "     npm start govdoc -- --input ./companies.gds --push"
    echo ""
    echo -e "  3. Access OpenSearch Dashboards:"
    echo -e "     http://localhost:5601"
    echo -e "     Username: admin"
    echo -e "     Password: ${OPENSEARCH_PROD_ADMIN_PASSWORD}"
    echo ""
}

# Main execution
main() {
    echo -e "${YELLOW}Step 1: Waiting for cluster readiness...${NC}"
    wait_for_opensearch
    
    echo -e "\n${YELLOW}Step 2: Checking cluster health...${NC}"
    check_cluster_health
    
    echo -e "\n${YELLOW}Step 3: Installing index template...${NC}"
    install_index_template
    
    echo -e "\n${YELLOW}Step 4: Creating initial index...${NC}"
    create_initial_index
    
    echo -e "\n${YELLOW}Step 5: Setting up aliases...${NC}"
    setup_aliases
    
    echo -e "\n${YELLOW}Step 6: Configuring backup repository...${NC}"
    setup_backup_repository
    
    echo -e "\n${YELLOW}Step 7: Testing application access...${NC}"
    test_application_access
    
    echo -e "\n${YELLOW}Step 8: Final health check...${NC}"
    check_cluster_health
    
    display_summary
}

# Run main function
main "$@"
