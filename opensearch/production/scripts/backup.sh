#!/bin/bash

# Backup script for GovDoc Scanner OpenSearch Production
# Creates snapshots and manages backup retention

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
BACKUP_REPO="govdoc-backup-repo"
RETENTION_DAYS=30

# Check if environment file exists
if [ ! -f "../production.env" ]; then
    echo -e "${RED}Error: production.env file not found!${NC}"
    exit 1
fi

# Source environment variables
source ../production.env

# Generate snapshot name with timestamp
SNAPSHOT_NAME="govdoc-daily-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}=== GovDoc Scanner - Production Backup ===${NC}"
echo -e "Timestamp: $(date)"
echo -e "Snapshot name: $SNAPSHOT_NAME"
echo ""

# Function to check if jq is available
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not found. Install for better JSON parsing.${NC}"
        return 1
    fi
    return 0
}

HAS_JQ=$(check_jq && echo "true" || echo "false")

# Function to check cluster health before backup
check_cluster_health() {
    echo -e "${YELLOW}Checking cluster health before backup...${NC}"
    
    local health_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                           "${OPENSEARCH_URL}/_cluster/health" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$health_response" ]; then
        echo -e "${RED}✗ Cannot connect to OpenSearch cluster${NC}"
        exit 1
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        local status=$(echo "$health_response" | jq -r '.status // "unknown"')
        
        case $status in
            "green")
                echo -e "${GREEN}✓ Cluster status: GREEN - proceeding with backup${NC}"
                ;;
            "yellow")
                echo -e "${YELLOW}⚠ Cluster status: YELLOW - backup will proceed but check cluster${NC}"
                ;;
            "red")
                echo -e "${RED}✗ Cluster status: RED - backup may fail${NC}"
                read -p "Continue anyway? (y/N): " -r
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    echo -e "${YELLOW}Backup cancelled${NC}"
                    exit 1
                fi
                ;;
            *)
                echo -e "${YELLOW}⚠ Unknown cluster status - proceeding with caution${NC}"
                ;;
        esac
    fi
}

# Function to list current snapshots
list_current_snapshots() {
    echo -e "\n${YELLOW}Current snapshots in repository:${NC}"
    
    local snapshots_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                              "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/_all" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$snapshots_response" ]; then
        echo -e "${YELLOW}  No snapshots found or repository not accessible${NC}"
        return 0
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        local snapshot_count=$(echo "$snapshots_response" | jq -r '.snapshots | length')
        echo -e "  • Total snapshots: $snapshot_count"
        
        if [ "$snapshot_count" -gt 0 ]; then
            echo -e "  • Recent snapshots:"
            echo "$snapshots_response" | jq -r '.snapshots[-5:] | .[] | "    \(.snapshot) - \(.start_time) (\(.state))"'
        fi
    else
        echo -e "  ${YELLOW}Install jq for detailed snapshot listing${NC}"
    fi
}

# Function to create snapshot
create_snapshot() {
    echo -e "\n${YELLOW}Creating snapshot: $SNAPSHOT_NAME${NC}"
    
    local snapshot_config='{
        "indices": "govdoc-companies-*",
        "ignore_unavailable": true,
        "include_global_state": false,
        "metadata": {
            "taken_by": "automated-backup",
            "taken_because": "scheduled backup",
            "backup_type": "daily",
            "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
        }
    }'
    
    echo -e "  • Initiating snapshot..."
    local response=$(curl -k -s -w "%{http_code}" -o /tmp/snapshot_response.json \
                    -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                    -H 'Content-Type: application/json' \
                    -X PUT "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/${SNAPSHOT_NAME}?wait_for_completion=false" \
                    -d "$snapshot_config")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}  ✓ Snapshot initiated successfully${NC}"
        
        # Monitor snapshot progress
        monitor_snapshot_progress
        
    else
        echo -e "${RED}  ✗ Failed to initiate snapshot (HTTP $response)${NC}"
        cat /tmp/snapshot_response.json
        exit 1
    fi
}

# Function to monitor snapshot progress
monitor_snapshot_progress() {
    echo -e "  • Monitoring snapshot progress..."
    
    local max_wait_minutes=30
    local check_interval=10
    local checks_performed=0
    local max_checks=$((max_wait_minutes * 60 / check_interval))
    
    while [ $checks_performed -lt $max_checks ]; do
        local status_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                               "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/${SNAPSHOT_NAME}" 2>/dev/null)
        
        if [ $? -ne 0 ] || [ -z "$status_response" ]; then
            echo -e "${RED}    ✗ Cannot check snapshot status${NC}"
            return 1
        fi
        
        if [ "$HAS_JQ" = "true" ]; then
            local state=$(echo "$status_response" | jq -r '.snapshots[0].state // "unknown"')
            local progress=$(echo "$status_response" | jq -r '.snapshots[0].shards.successful // 0')
            local total=$(echo "$status_response" | jq -r '.snapshots[0].shards.total // 0')
            
            case $state in
                "IN_PROGRESS")
                    echo -e "    • Progress: $progress/$total shards completed"
                    ;;
                "SUCCESS")
                    echo -e "${GREEN}    ✓ Snapshot completed successfully${NC}"
                    
                    # Get snapshot details
                    local size=$(echo "$status_response" | jq -r '.snapshots[0].stats.total.size_in_bytes // 0')
                    local duration=$(echo "$status_response" | jq -r '.snapshots[0].duration_in_millis // 0')
                    
                    if [ "$size" != "0" ] && [ "$size" != "null" ]; then
                        local size_mb=$((size / 1024 / 1024))
                        echo -e "    • Backup size: ${size_mb} MB"
                    fi
                    
                    if [ "$duration" != "0" ] && [ "$duration" != "null" ]; then
                        local duration_sec=$((duration / 1000))
                        echo -e "    • Duration: ${duration_sec} seconds"
                    fi
                    
                    return 0
                    ;;
                "FAILED")
                    echo -e "${RED}    ✗ Snapshot failed${NC}"
                    local failures=$(echo "$status_response" | jq -r '.snapshots[0].failures // []')
                    if [ "$failures" != "[]" ]; then
                        echo -e "    • Failures: $failures"
                    fi
                    return 1
                    ;;
                "PARTIAL")
                    echo -e "${YELLOW}    ⚠ Snapshot completed partially${NC}"
                    return 1
                    ;;
                *)
                    echo -e "    • Status: $state"
                    ;;
            esac
        else
            echo -e "    • Checking snapshot status (install jq for details)..."
        fi
        
        sleep $check_interval
        ((checks_performed++))
    done
    
    echo -e "${YELLOW}    ⚠ Snapshot taking longer than expected (${max_wait_minutes} minutes)${NC}"
    echo -e "    • Check snapshot status manually: /_snapshot/${BACKUP_REPO}/${SNAPSHOT_NAME}"
    return 1
}

# Function to cleanup old snapshots
cleanup_old_snapshots() {
    echo -e "\n${YELLOW}Cleaning up old snapshots...${NC}"
    
    local snapshots_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                              "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/_all" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$snapshots_response" ]; then
        echo -e "${YELLOW}  Cannot retrieve snapshots for cleanup${NC}"
        return 0
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        # Calculate cutoff date
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        echo -e "  • Retention policy: $RETENTION_DAYS days (cutoff: $cutoff_date)"
        
        # Get list of snapshots to delete
        local old_snapshots=$(echo "$snapshots_response" | jq -r --arg cutoff "$cutoff_date" '
            .snapshots[] | 
            select(.snapshot | test("govdoc-daily-[0-9]{8}")) |
            select((.snapshot | split("-")[2] | split("-")[0]) < $cutoff) |
            .snapshot
        ')
        
        if [ -z "$old_snapshots" ]; then
            echo -e "${GREEN}  ✓ No old snapshots to clean up${NC}"
            return 0
        fi
        
        local deleted_count=0
        while IFS= read -r snapshot_name; do
            if [ -n "$snapshot_name" ]; then
                echo -e "  • Deleting old snapshot: $snapshot_name"
                
                local delete_response=$(curl -k -s -w "%{http_code}" -o /tmp/delete_response.json \
                                       -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                                       -X DELETE "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/${snapshot_name}")
                
                if [ "$delete_response" = "200" ]; then
                    echo -e "${GREEN}    ✓ Deleted successfully${NC}"
                    ((deleted_count++))
                else
                    echo -e "${RED}    ✗ Failed to delete (HTTP $delete_response)${NC}"
                fi
            fi
        done <<< "$old_snapshots"
        
        echo -e "  • Cleaned up $deleted_count old snapshots"
        
    else
        echo -e "  ${YELLOW}Install jq for automatic cleanup${NC}"
    fi
}

# Function to verify backup repository
verify_repository() {
    echo -e "\n${YELLOW}Verifying backup repository...${NC}"
    
    local verify_response=$(curl -k -s -w "%{http_code}" -o /tmp/verify_response.json \
                           -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                           -X POST "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/_verify")
    
    if [ "$verify_response" = "200" ]; then
        echo -e "${GREEN}  ✓ Backup repository is accessible${NC}"
    else
        echo -e "${RED}  ✗ Backup repository verification failed (HTTP $verify_response)${NC}"
        cat /tmp/verify_response.json
        return 1
    fi
}

# Function to generate backup report
generate_report() {
    echo -e "\n${BLUE}=== Backup Report ===${NC}"
    echo -e "Date: $(date)"
    echo -e "Snapshot: $SNAPSHOT_NAME"
    echo -e "Repository: $BACKUP_REPO"
    echo -e "Retention: $RETENTION_DAYS days"
    
    # Final snapshot count
    local snapshots_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                              "${OPENSEARCH_URL}/_snapshot/${BACKUP_REPO}/_all" 2>/dev/null)
    
    if [ "$HAS_JQ" = "true" ] && [ -n "$snapshots_response" ]; then
        local snapshot_count=$(echo "$snapshots_response" | jq -r '.snapshots | length')
        echo -e "Total snapshots: $snapshot_count"
    fi
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "  • Schedule this script to run daily"
    echo -e "  • Monitor backup success in logs"
    echo -e "  • Test restore procedure periodically"
    echo -e "  • Consider offsite backup replication"
    
    echo -e "\n${GREEN}Backup process completed${NC}"
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 [options]${NC}"
    echo -e ""
    echo -e "Options:"
    echo -e "  --list-only     List current snapshots without creating new one"
    echo -e "  --cleanup-only  Clean up old snapshots without creating new one"
    echo -e "  --verify-only   Verify repository without creating snapshot"
    echo -e "  --help         Show this help message"
    echo -e ""
    echo -e "Examples:"
    echo -e "  $0                    # Full backup with cleanup"
    echo -e "  $0 --list-only        # List current snapshots"
    echo -e "  $0 --cleanup-only     # Clean up old snapshots"
    echo -e ""
}

# Main execution based on arguments
case "${1:-}" in
    --list-only)
        list_current_snapshots
        ;;
    --cleanup-only)
        check_cluster_health
        cleanup_old_snapshots
        ;;
    --verify-only)
        verify_repository
        ;;
    --help)
        show_usage
        ;;
    "")
        # Full backup process
        check_cluster_health
        verify_repository
        list_current_snapshots
        create_snapshot
        cleanup_old_snapshots
        generate_report
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_usage
        exit 1
        ;;
esac
