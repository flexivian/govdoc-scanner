#!/bin/bash

# Script to setup OpenSearch Dashboards with GovDoc index patterns
# This creates index patterns for visualizing company data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DASHBOARDS_URL="http://localhost:5601"
OPENSEARCH_URL="https://localhost:9200"

echo -e "${BLUE}=== Setting up OpenSearch Dashboards Index Patterns ===${NC}"
echo ""

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found! Run ./setup-security.sh first${NC}"
    exit 1
fi

# Source environment variables
source .env

# Function to wait for OpenSearch Dashboards to be ready
wait_for_dashboards() {
    echo -e "${YELLOW}Waiting for OpenSearch Dashboards to be ready...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Try to access the login page (which should be available without auth)
        if curl -s "${DASHBOARDS_URL}/login" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OpenSearch Dashboards is ready${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt ${attempt}/${max_attempts} - waiting...${NC}"
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}Error: OpenSearch Dashboards did not become ready${NC}"
    echo -e "${YELLOW}Make sure OpenSearch Dashboards is running on ${DASHBOARDS_URL}${NC}"
    exit 1
}

# Function to wait for OpenSearch to be ready
wait_for_opensearch() {
    echo -e "${YELLOW}Waiting for OpenSearch to be ready...${NC}"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
           "${OPENSEARCH_URL}/_cluster/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OpenSearch is ready${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt ${attempt}/${max_attempts} - waiting...${NC}"
        sleep 5
        ((attempt++))
    done
    
    echo -e "${RED}Error: OpenSearch is not ready${NC}"
    exit 1
}

# Function to check if index pattern exists
check_index_pattern_exists() {
    local pattern_id="$1"
    local response=$(curl -s -w "%{http_code}" -o /tmp/check_pattern.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    "${DASHBOARDS_URL}/api/saved_objects/index-pattern/${pattern_id}")
    
    if [ "$response" = "200" ]; then
        return 0  # exists
    else
        return 1  # doesn't exist
    fi
}

# Function to create main companies index pattern
create_companies_index_pattern() {
    echo -e "\n${YELLOW}Creating companies index pattern...${NC}"
    
    local pattern_id="govdoc-companies-*"
    
    # Check if pattern already exists
    if check_index_pattern_exists "$pattern_id"; then
        echo -e "${GREEN}✓ Companies index pattern already exists${NC}"
        return 0
    fi
    
    # Create the index pattern
    local index_pattern_config='{
        "attributes": {
            "title": "govdoc-companies-*",
            "timeFieldName": "scan_date",
            "fields": "[{\"name\":\"gemi_id\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"company_name\",\"type\":\"string\",\"esTypes\":[\"text\"],\"searchable\":true,\"aggregatable\":false},{\"name\":\"company_name.raw\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"company_tax_id\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"creation_date\",\"type\":\"date\",\"esTypes\":[\"date\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"scan_date\",\"type\":\"date\",\"esTypes\":[\"date\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"registered_address\",\"type\":\"string\",\"esTypes\":[\"text\"],\"searchable\":true,\"aggregatable\":false},{\"name\":\"registered_address.raw\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"company_type\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"competent_gemi_office\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"region\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"city\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"postal_code\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"document_date\",\"type\":\"date\",\"esTypes\":[\"date\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"tracked_changes_current\",\"type\":\"string\",\"esTypes\":[\"text\"],\"searchable\":true,\"aggregatable\":false},{\"name\":\"representatives.name\",\"type\":\"string\",\"esTypes\":[\"text\"],\"searchable\":true,\"aggregatable\":false},{\"name\":\"representatives.name.raw\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"representatives.role\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"representatives.is_active\",\"type\":\"boolean\",\"esTypes\":[\"boolean\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"representatives.tax_id\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"representatives.capital_share_text\",\"type\":\"string\",\"esTypes\":[\"keyword\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"representatives.capital_share_percent\",\"type\":\"number\",\"esTypes\":[\"scaled_float\"],\"searchable\":true,\"aggregatable\":true},{\"name\":\"representatives.capital_share_amount_eur\",\"type\":\"number\",\"esTypes\":[\"scaled_float\"],\"searchable\":true,\"aggregatable\":true}]",
            "fieldFormatMap": "{\"scan_date\":{\"id\":\"date\"},\"creation_date\":{\"id\":\"date\"},\"document_date\":{\"id\":\"date\"},\"representatives.capital_share_percent\":{\"id\":\"percent\"},\"representatives.capital_share_amount_eur\":{\"id\":\"number\",\"params\":{\"pattern\":\"€0,0.00\"}}}",
            "sourceFilters": "[]",
            "fieldAttrs": "{}"
        }
    }'
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/pattern_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -H 'osd-xsrf: true' \
                    -X POST "${DASHBOARDS_URL}/api/saved_objects/index-pattern/${pattern_id}" \
                    -d "$index_pattern_config")
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo -e "${GREEN}✓ Companies index pattern created successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to create companies index pattern (HTTP $response)${NC}"
        cat /tmp/pattern_response.json
        return 1
    fi
}

# Function to set default index pattern
set_default_index_pattern() {
    echo -e "\n${YELLOW}Setting default index pattern...${NC}"
    
    local default_config='{
        "value": "govdoc-companies-*"
    }'
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/default_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -H 'osd-xsrf: true' \
                    -X POST "${DASHBOARDS_URL}/api/opensearch-dashboards/settings/defaultIndex" \
                    -d "$default_config")
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo -e "${GREEN}✓ Default index pattern set successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Could not set default index pattern (HTTP $response) - can be set manually${NC}"
        # Don't fail the script for this, as it's not critical
    fi
}

# Function to refresh field list
refresh_field_list() {
    echo -e "\n${YELLOW}Refreshing field list for index pattern...${NC}"
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/refresh_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -H 'osd-xsrf: true' \
                    -X POST "${DASHBOARDS_URL}/api/index_patterns/_fields_for_wildcard" \
                    -d '{"pattern": "govdoc-companies-*", "meta_fields": ["_source", "_id", "_type", "_index", "_score"]}')
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Field list refreshed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Could not refresh field list (HTTP $response) - fields will be detected automatically${NC}"
    fi
}

# Function to verify index pattern creation
verify_index_pattern() {
    echo -e "\n${YELLOW}Verifying index pattern...${NC}"
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/verify_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    "${DASHBOARDS_URL}/api/saved_objects/index-pattern/govdoc-companies-*")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Index pattern verified successfully${NC}"
        
        # Show some details about the pattern
        local title=$(cat /tmp/verify_response.json | jq -r '.attributes.title // "unknown"' 2>/dev/null || echo "unknown")
        local time_field=$(cat /tmp/verify_response.json | jq -r '.attributes.timeFieldName // "none"' 2>/dev/null || echo "none")
        
        echo -e "${BLUE}Pattern Details:${NC}"
        echo -e "  • Title: ${title}"
        echo -e "  • Time Field: ${time_field}"
        
        return 0
    else
        echo -e "${RED}✗ Failed to verify index pattern${NC}"
        cat /tmp/verify_response.json
        return 1
    fi
}

# Function to display summary
display_summary() {
    echo -e "\n${GREEN}=== Dashboard Setup Complete ===${NC}"
    echo ""
    echo -e "${BLUE}Index Pattern Information:${NC}"
    echo -e "  • Pattern: govdoc-companies-*"
    echo -e "  • Time Field: scan_date"
    echo -e "  • Matches indexes: govdoc-companies-000001, govdoc-companies-000002, etc."
    echo ""
}

# Main execution
main() {
    echo -e "${YELLOW}Step 1: Checking OpenSearch readiness...${NC}"
    wait_for_opensearch
    
    echo -e "\n${YELLOW}Step 2: Waiting for Dashboards readiness...${NC}"
    wait_for_dashboards
    
    echo -e "\n${YELLOW}Step 3: Creating index patterns...${NC}"
    if create_companies_index_pattern; then
        echo -e "${GREEN}✓ Index pattern creation successful${NC}"
    else
        echo -e "${RED}✗ Index pattern creation failed${NC}"
        exit 1
    fi
    
    echo -e "\n${YELLOW}Step 4: Setting default index pattern...${NC}"
    set_default_index_pattern
    
    echo -e "\n${YELLOW}Step 5: Refreshing field list...${NC}"
    refresh_field_list
    
    echo -e "\n${YELLOW}Step 6: Verifying setup...${NC}"
    if verify_index_pattern; then
        echo -e "${GREEN}✓ Setup verification successful${NC}"
    else
        echo -e "${YELLOW}⚠ Setup verification had issues, but index pattern should still work${NC}"
    fi
    
    display_summary
}

# Run main function
main "$@"
