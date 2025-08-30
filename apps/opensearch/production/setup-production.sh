#!/bin/bash

# GovDoc Scanner - Production OpenSearch Setup
# This script runs the production setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"

echo -e "${BLUE}GovDoc Scanner - Production Setup${NC}"

# Function to run a step with error handling
run_step() {
    local step_number="$1"
    local step_name="$2"
    local script_name="$3"
    local description="$4"
    
    echo -e "${YELLOW}Step ${step_number}: ${step_name}${NC}"
    
    local script_path="${SCRIPTS_DIR}/${script_name}"
    
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}✗ Script not found: ${script_path}${NC}"
        exit 1
    fi
    
    if [ ! -x "$script_path" ]; then
        chmod +x "$script_path"
    fi
    
    if "$script_path" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${step_name} completed${NC}"
    else
        echo -e "${RED}✗ ${step_name} failed${NC}"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker Compose is not available${NC}"
        exit 1
    fi
    
    # Check if required utilities are available
    local required_utils=("openssl" "jq" "curl")
    for util in "${required_utils[@]}"; do
        if ! command -v "$util" > /dev/null 2>&1; then
            echo -e "${RED}✗ Required utility not found: ${util}. Please install and try again.${NC}"
            exit 1
        fi
    done
}

# Function to show setup overview
show_setup_overview() {
    echo -e "${BLUE}Starting production OpenSearch setup...${NC}"
    echo ""
}

# Function to show final summary
show_final_summary() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                     Production Setup Complete!                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ -f ".env" ]; then
        source .env
        
        echo -e "${GREEN}🎉 Your OpenSearch production cluster is ready!${NC}"
        echo ""
        echo -e "${BLUE}Access Information:${NC}"
        echo -e "${YELLOW}OpenSearch API:${NC}      https://localhost:9200"
        echo -e "${YELLOW}OpenSearch Dashboards:${NC} http://localhost:5601"
        echo ""
        echo -e "${YELLOW}Admin Username:${NC}      admin"
        echo -e "${YELLOW}Admin Password:${NC}      ${OPENSEARCH_PROD_ADMIN_PASSWORD}"
        echo ""
        echo -e "${YELLOW}App Username:${NC}        govdoc_ingest"
        echo -e "${YELLOW}App Password:${NC}        ${OPENSEARCH_PROD_GOVDOC_PASSWORD}"
        echo -e "${YELLOW}App Index:${NC}           govdoc-companies-write"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo -e "1. ${YELLOW}Update your root .env file${NC} with these OpenSearch settings:"
        echo -e "   OPENSEARCH_PUSH=true"
        echo -e "   OPENSEARCH_URL=https://localhost:9200"
        echo -e "   OPENSEARCH_USERNAME=govdoc_ingest"
        echo -e "   OPENSEARCH_PASSWORD=${OPENSEARCH_PROD_GOVDOC_PASSWORD}"
        echo -e "   OPENSEARCH_INDEX=govdoc-companies-write"
        echo -e "   OPENSEARCH_INSECURE=true"
        echo ""
        echo -e "2. ${YELLOW}Test data ingestion:${NC}"
        echo -e "   cd /home/projects/govdoc-scanner"
        echo -e "   npm start govdoc -- --input ./companies.gds --push"
        echo ""
        echo -e "3. ${YELLOW}Access Dashboards:${NC}"
        echo -e "   Open: http://localhost:5601"
        echo -e "   Login with admin credentials shown above"
        echo ""
    else
        echo -e "${RED}✗ .env file not found - setup may not have completed properly${NC}"
    fi
    
    echo -e "${RED}🔒 Security Reminders:${NC}"
    echo -e "• ${RED}Replace demo certificates with proper CA-signed certificates${NC}"
    echo -e "• ${RED}Store passwords in a secure secrets management system${NC}"
    echo -e "• ${RED}Never commit the .env file to version control${NC}"
    echo -e "• ${RED}Set up proper firewall rules and network security${NC}"
    echo -e "• ${RED}Enable audit logging for compliance requirements${NC}"
    echo ""
    echo -e "${YELLOW}Logs and configuration files are in:${NC}"
    echo -e "• ${SCRIPT_DIR}/.env (passwords)"
    echo -e "• ${SCRIPT_DIR}/config/ (OpenSearch config)"
    echo -e "• ${SCRIPT_DIR}/certs/ (certificates)"
    echo ""
}

# Main execution
main() {
    # Step 0: Prerequisites check
    check_prerequisites
    show_setup_overview
    
    # Step 1: Security setup (passwords, certificates, config)
    run_step "1" "Security Setup" "setup-security.sh" \
        "Generate secure passwords, create certificates, and prepare security configuration files."
    
    # Step 2: Start the cluster
    echo -e "${YELLOW}Step 2: Starting Production Cluster (this may take 1-2 minutes)${NC}"
    
    if docker compose -f docker-compose.prod.yml up -d > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Production Cluster started${NC}"
        sleep 15  # Wait for cluster to stabilize
    else
        echo -e "${RED}✗ Failed to start OpenSearch cluster${NC}"
        exit 1
    fi
    
    # Step 3: Initialize security configuration
    run_step "3" "Security Initialization" "initialize-security.sh" \
        "Initialize OpenSearch security configuration using securityadmin.sh tool."
    
    # Step 4: Initialize cluster
    run_step "4" "Cluster Initialization" "initialize-cluster.sh" \
        "Create index templates, initial indices, aliases, and backup repositories."
    
    # Step 5: Setup dashboards
    run_step "5" "Dashboard Setup" "setup-dashboards.sh" \
        "Configure OpenSearch Dashboards with index patterns for data visualization."
    
    # Final summary
    show_final_summary
}

# Error handling
trap 'echo -e "\n${RED}Setup interrupted. Cluster may be partially configured.${NC}"; exit 1' INT

# Change to the production directory
cd "$SCRIPT_DIR"

# Run main function
main "$@"
