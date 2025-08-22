#!/bin/bash

# Health monitoring script for GovDoc Scanner OpenSearch Production
# This script checks cluster health and system metrics

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

# Check if environment file exists
if [ ! -f "../production.env" ]; then
    echo -e "${RED}Error: production.env file not found!${NC}"
    exit 1
fi

# Source environment variables
source ../production.env

echo -e "${BLUE}=== GovDoc Scanner - Production Health Check ===${NC}"
echo -e "Timestamp: $(date)"
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

# Function to check cluster health
check_cluster_health() {
    echo -e "${YELLOW}Checking cluster health...${NC}"
    
    local health_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                           "${OPENSEARCH_URL}/_cluster/health" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$health_response" ]; then
        echo -e "${RED}✗ Cannot connect to OpenSearch cluster${NC}"
        return 1
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        local status=$(echo "$health_response" | jq -r '.status // "unknown"')
        local nodes=$(echo "$health_response" | jq -r '.number_of_nodes // "unknown"')
        local data_nodes=$(echo "$health_response" | jq -r '.number_of_data_nodes // "unknown"')
        local active_shards=$(echo "$health_response" | jq -r '.active_shards // "unknown"')
        local relocating_shards=$(echo "$health_response" | jq -r '.relocating_shards // "unknown"')
        local initializing_shards=$(echo "$health_response" | jq -r '.initializing_shards // "unknown"')
        local unassigned_shards=$(echo "$health_response" | jq -r '.unassigned_shards // "unknown"')
        
        case $status in
            "green")
                echo -e "${GREEN}✓ Cluster Status: GREEN (healthy)${NC}"
                ;;
            "yellow")
                echo -e "${YELLOW}⚠ Cluster Status: YELLOW (functional but degraded)${NC}"
                ;;
            "red")
                echo -e "${RED}✗ Cluster Status: RED (unhealthy)${NC}"
                ;;
            *)
                echo -e "${RED}✗ Cluster Status: UNKNOWN${NC}"
                ;;
        esac
        
        echo -e "  • Nodes: $nodes (Data nodes: $data_nodes)"
        echo -e "  • Active shards: $active_shards"
        echo -e "  • Relocating shards: $relocating_shards"
        echo -e "  • Initializing shards: $initializing_shards"
        echo -e "  • Unassigned shards: $unassigned_shards"
        
        if [ "$unassigned_shards" != "0" ] && [ "$unassigned_shards" != "unknown" ]; then
            echo -e "${YELLOW}  ⚠ Warning: Unassigned shards detected${NC}"
        fi
    else
        echo "$health_response"
    fi
}

# Function to check node stats
check_node_stats() {
    echo -e "\n${YELLOW}Checking node statistics...${NC}"
    
    local stats_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                          "${OPENSEARCH_URL}/_nodes/stats" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$stats_response" ]; then
        echo -e "${RED}✗ Cannot retrieve node statistics${NC}"
        return 1
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        local heap_used_percent=$(echo "$stats_response" | jq -r '.nodes | to_entries[0].value.jvm.mem.heap_used_percent // "unknown"')
        local heap_used_in_bytes=$(echo "$stats_response" | jq -r '.nodes | to_entries[0].value.jvm.mem.heap_used_in_bytes // "unknown"')
        local heap_max_in_bytes=$(echo "$stats_response" | jq -r '.nodes | to_entries[0].value.jvm.mem.heap_max_in_bytes // "unknown"')
        
        echo -e "  • Heap usage: ${heap_used_percent}%"
        
        if [ "$heap_used_percent" != "unknown" ] && [ "$heap_used_percent" != "null" ]; then
            if [ $(echo "$heap_used_percent > 85" | bc 2>/dev/null || echo "0") -eq 1 ]; then
                echo -e "${RED}    ⚠ Critical: High heap usage (>85%)${NC}"
            elif [ $(echo "$heap_used_percent > 70" | bc 2>/dev/null || echo "0") -eq 1 ]; then
                echo -e "${YELLOW}    ⚠ Warning: Elevated heap usage (>70%)${NC}"
            fi
        fi
        
        if [ "$heap_used_in_bytes" != "unknown" ] && [ "$heap_max_in_bytes" != "unknown" ]; then
            local heap_used_gb=$(echo "scale=2; $heap_used_in_bytes / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
            local heap_max_gb=$(echo "scale=2; $heap_max_in_bytes / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
            echo -e "  • Heap memory: ${heap_used_gb}GB / ${heap_max_gb}GB"
        fi
    else
        echo -e "  ${YELLOW}Install jq for detailed statistics${NC}"
    fi
}

# Function to check index statistics
check_index_stats() {
    echo -e "\n${YELLOW}Checking index statistics...${NC}"
    
    local indices_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                            "${OPENSEARCH_URL}/_cat/indices/govdoc-companies-*?format=json" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$indices_response" ]; then
        echo -e "${YELLOW}  No GovDoc indices found or cannot retrieve statistics${NC}"
        return 0
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        local total_docs=0
        local total_size=0
        
        echo "$indices_response" | jq -r '.[] | "\(.index) \(.docs.count // 0) \(.store.size // "0b")"' | while read -r index docs size; do
            echo -e "  • Index: $index"
            echo -e "    Documents: $docs"
            echo -e "    Size: $size"
            
            # Check if index is getting large
            local size_bytes=$(echo "$size" | sed 's/[^0-9]//g')
            if [ -n "$size_bytes" ] && [ "$size_bytes" -gt 50000000000 ]; then  # 50GB
                echo -e "${YELLOW}    ⚠ Warning: Large index (>50GB) - consider rollover${NC}"
            fi
        done
    else
        echo -e "  ${YELLOW}Install jq for detailed index statistics${NC}"
    fi
}

# Function to check disk usage
check_disk_usage() {
    echo -e "\n${YELLOW}Checking disk usage...${NC}"
    
    # Check container disk usage if running in Docker
    if command -v docker &> /dev/null; then
        local container_id=$(docker ps --filter "name=govdoc-opensearch-production" --format "{{.ID}}" 2>/dev/null)
        if [ -n "$container_id" ]; then
            echo -e "  • Container disk usage:"
            docker exec "$container_id" df -h /usr/share/opensearch/data 2>/dev/null | tail -1 | awk '{
                print "    Data directory: " $3 " used / " $2 " total (" $5 " usage)"
                if (substr($5, 1, length($5)-1) > 80) print "    ⚠ Warning: High disk usage (>80%)"
            }' || echo -e "${YELLOW}    Cannot check container disk usage${NC}"
        fi
    fi
    
    # Check host disk usage
    echo -e "  • Host disk usage:"
    df -h . | tail -1 | awk '{
        print "    Current directory: " $3 " used / " $2 " total (" $5 " usage)"
        if (substr($5, 1, length($5)-1) > 80) print "    ⚠ Warning: High disk usage (>80%)"
    }'
}

# Function to check recent snapshots
check_snapshots() {
    echo -e "\n${YELLOW}Checking recent snapshots...${NC}"
    
    local snapshots_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                              "${OPENSEARCH_URL}/_snapshot/govdoc-backup-repo/_all" 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$snapshots_response" ]; then
        echo -e "${YELLOW}  No snapshots found or backup repository not configured${NC}"
        return 0
    fi
    
    if [ "$HAS_JQ" = "true" ]; then
        local snapshot_count=$(echo "$snapshots_response" | jq -r '.snapshots | length')
        echo -e "  • Total snapshots: $snapshot_count"
        
        if [ "$snapshot_count" -gt 0 ]; then
            echo -e "  • Recent snapshots:"
            echo "$snapshots_response" | jq -r '.snapshots[-3:] | .[] | "    \(.snapshot) - \(.start_time) (\(.state))"'
            
            local latest_state=$(echo "$snapshots_response" | jq -r '.snapshots[-1].state')
            if [ "$latest_state" = "SUCCESS" ]; then
                echo -e "${GREEN}    ✓ Latest snapshot successful${NC}"
            else
                echo -e "${RED}    ✗ Latest snapshot state: $latest_state${NC}"
            fi
        fi
    else
        echo -e "  ${YELLOW}Install jq for detailed snapshot information${NC}"
    fi
}

# Function to check security
check_security() {
    echo -e "\n${YELLOW}Checking security configuration...${NC}"
    
    # Check if HTTPS is enabled
    if echo "${OPENSEARCH_URL}" | grep -q "https://"; then
        echo -e "${GREEN}  ✓ HTTPS enabled${NC}"
    else
        echo -e "${RED}  ✗ HTTPS not enabled - security risk${NC}"
    fi
    
    # Check authentication
    local auth_test=$(curl -k -s -w "%{http_code}" -o /dev/null "${OPENSEARCH_URL}/_cluster/health" 2>/dev/null)
    if [ "$auth_test" = "401" ]; then
        echo -e "${GREEN}  ✓ Authentication required${NC}"
    else
        echo -e "${YELLOW}  ⚠ Authentication may not be properly configured${NC}"
    fi
}

# Function to generate summary and recommendations
generate_summary() {
    echo -e "\n${BLUE}=== Health Check Summary ===${NC}"
    echo -e "Status: Complete"
    echo -e "Timestamp: $(date)"
    
    echo -e "\n${BLUE}Recommendations:${NC}"
    
    # Check if this is first run without data
    local count_response=$(curl -k -s -u "admin:${OPENSEARCH_PROD_ADMIN_PASSWORD}" \
                          "${OPENSEARCH_URL}/govdoc-companies/_count" 2>/dev/null)
    
    if [ $? -ne 0 ] || echo "$count_response" | grep -q "index_not_found"; then
        echo -e "  • ${YELLOW}No data indexed yet - run data ingestion to populate cluster${NC}"
        echo -e "    Command: npm start govdoc -- --input ./companies.gds --push"
    fi
    
    echo -e "  • Schedule regular health checks (e.g., every 15 minutes)"
    echo -e "  • Monitor disk usage and plan for scaling at 80% capacity"
    echo -e "  • Ensure daily backups are running successfully"
    echo -e "  • Review cluster status if YELLOW or RED"
    
    echo -e "\n${BLUE}Next Health Check:${NC}"
    echo -e "  • Run this script again in 15-30 minutes"
    echo -e "  • Set up automated monitoring with alerts"
    echo -e "  • Consider adding this to crontab for regular checks"
}

# Main execution
main() {
    check_cluster_health
    check_node_stats
    check_index_stats
    check_disk_usage
    check_snapshots
    check_security
    generate_summary
}

# Check command line arguments
case "${1:-}" in
    --quiet)
        main 2>/dev/null
        ;;
    --json)
        echo -e "${YELLOW}JSON output not yet implemented${NC}"
        main
        ;;
    *)
        main
        ;;
esac
