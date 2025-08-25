#!/bin/bash

# GovDoc Scanner - Production Cleanup Script
# This script removes the production OpenSearch setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                       PRODUCTION CLEANUP                             ║${NC}"
echo -e "${RED}║                    ⚠️  DESTRUCTIVE OPERATION  ⚠️                       ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}This script will remove the production OpenSearch setup:${NC}"
echo -e "• Stop and remove all containers"
echo -e "• Remove all volumes and data"
echo -e "• Delete generated configuration files"
echo -e "• Delete certificates"
echo -e "• Delete environment files"
echo ""
echo -e "${RED}⚠️  ALL DATA WILL BE PERMANENTLY LOST ⚠️${NC}"
echo ""
echo -e "${YELLOW}Are you sure you want to proceed? Type 'yes' to confirm: ${NC}"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${GREEN}Operation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting cleanup...${NC}"
echo ""

# Stop and remove containers
echo -e "${YELLOW}Stopping and removing containers...${NC}"
if docker compose -f docker-compose.prod.yml down --volumes --remove-orphans; then
    echo -e "${GREEN}✓ Containers stopped and removed${NC}"
else
    echo -e "${YELLOW}⚠ No containers to remove or docker-compose failed${NC}"
fi

# Remove any remaining containers with opensearch in the name
echo -e "${YELLOW}Cleaning up any remaining OpenSearch containers...${NC}"
if docker ps -a --filter "name=opensearch" --filter "name=dashboards" -q | xargs -r docker rm -f; then
    echo -e "${GREEN}✓ Remaining containers cleaned up${NC}"
else
    echo -e "${GREEN}✓ No remaining containers to clean up${NC}"
fi

# Remove volumes
echo -e "${YELLOW}Removing Docker volumes...${NC}"
if docker volume ls -q --filter "name=opensearch" | xargs -r docker volume rm; then
    echo -e "${GREEN}✓ Docker volumes removed${NC}"
else
    echo -e "${GREEN}✓ No OpenSearch volumes to remove${NC}"
fi

# Remove generated files
echo -e "${YELLOW}Removing generated configuration files...${NC}"

files_to_remove=(
    ".env"
    "config/internal_users.yml"
    "config/roles.yml"
    "config/roles_mapping.yml"
)

for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo -e "${GREEN}✓ Removed: $file${NC}"
    else
        echo -e "${YELLOW}⚠ File not found: $file${NC}"
    fi
done

# Remove certificates directory
echo -e "${YELLOW}Removing certificates...${NC}"
if [ -d "certs" ]; then
    rm -rf certs
    echo -e "${GREEN}✓ Certificates directory removed${NC}"
else
    echo -e "${YELLOW}⚠ Certificates directory not found${NC}"
fi

# Remove generated scripts
echo -e "${YELLOW}Removing generated demo certificate script...${NC}"
if [ -f "scripts/generate-demo-certs.sh" ]; then
    rm "scripts/generate-demo-certs.sh"
    echo -e "${GREEN}✓ Demo certificate script removed${NC}"
else
    echo -e "${YELLOW}⚠ Demo certificate script not found${NC}"
fi

# Clean up temporary files
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -f /tmp/*_response.json /tmp/check_pattern.json /tmp/user_*.json 2>/dev/null || true
echo -e "${GREEN}✓ Temporary files cleaned up${NC}"

# Remove Docker network (if created)
echo -e "${YELLOW}Removing Docker networks...${NC}"
if docker network ls --filter "name=opensearch" -q | xargs -r docker network rm; then
    echo -e "${GREEN}✓ Docker networks removed${NC}"
else
    echo -e "${GREEN}✓ No OpenSearch networks to remove${NC}"
fi

# Final cleanup - remove any dangling images
echo -e "${YELLOW}Cleaning up dangling Docker images...${NC}"
if docker image prune -f > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dangling images cleaned up${NC}"
else
    echo -e "${YELLOW}⚠ Could not clean up dangling images${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                        Cleanup Complete                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Production OpenSearch setup has been removed${NC}"
echo ""
echo -e "${BLUE}To set up OpenSearch again, run:${NC}"
echo -e "  ./setup-production.sh"
echo ""
echo -e "${YELLOW}Note: This cleanup only affects the production OpenSearch setup.${NC}"
echo -e "${YELLOW}Your application data in the main project directory is unchanged.${NC}"
echo ""
