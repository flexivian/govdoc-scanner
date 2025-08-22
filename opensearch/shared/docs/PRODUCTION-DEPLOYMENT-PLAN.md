# GovDoc Scanner: Minimal Production Deployment Plan

**Version**: 1.0  
**Date**: August 22, 2025  
**Target**: OpenSearch 3.1+ Production Deployment  
**Philosophy**: Minimal viable production with security and reliability

---

## Executive Summary

This plan provides the **minimum viable production deployment** for the GovDoc Scanner OpenSearch cluster. It prioritizes **security**, **reliability**, and **simplicity** over advanced features.

**Key Principles:**

- Start small, scale gradually
- Security-first approach
- Minimal moving parts
- Clear upgrade path
- Battle-tested configurations

---

## Phase 1: Minimal Production Setup (MVP)

### Infrastructure Requirements

#### Server Specifications (Single Node Start)

```
Minimum Production Node:
- CPU: 4 vCPUs (8 vCPUs recommended)
- RAM: 16 GB (32 GB recommended)
- Disk: 200 GB SSD (with 20% free space buffer)
- Network: 1 Gbps
- OS: Ubuntu 22.04 LTS or RHEL 9
```

#### System Configuration

```bash
# Memory settings (critical for OpenSearch)
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
echo 'vm.swappiness=1' >> /etc/sysctl.conf
sysctl -p

# File descriptor limits
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf
echo '* soft memlock unlimited' >> /etc/security/limits.conf
echo '* hard memlock unlimited' >> /etc/security/limits.conf

# Disable swap (recommended)
swapoff -a
sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

### Security Configuration (Non-Negotiable)

#### 1. TLS/SSL Setup

**Replace demo certificates immediately:**

```bash
# Generate production certificates (use your own CA)
# Do NOT use demo certificates in production
./plugins/opensearch-security/tools/install_demo_configuration.sh -y
# ☝️ ONLY for initial setup, replace certificates immediately
```

**Minimal TLS Configuration:**

```yaml
# opensearch.yml - Security settings
plugins.security.ssl.transport.enabled: true
plugins.security.ssl.http.enabled: true
plugins.security.ssl.transport.enforce_hostname_verification: false
plugins.security.ssl.http.enforce_hostname_verification: false

# Use proper certificates (not demo!)
plugins.security.ssl.transport.pemcert_filepath: certs/node.pem
plugins.security.ssl.transport.pemkey_filepath: certs/node-key.pem
plugins.security.ssl.transport.pemtrustedcas_filepath: certs/root-ca.pem
plugins.security.ssl.http.pemcert_filepath: certs/node.pem
plugins.security.ssl.http.pemkey_filepath: certs/node-key.pem
plugins.security.ssl.http.pemtrustedcas_filepath: certs/root-ca.pem
```

#### 2. User Management

**Replace ALL default passwords:**

```bash
# Hash new passwords
./plugins/opensearch-security/tools/hash.sh -p 'YourStrongPassword123!'

# Update internal_users.yml with hashed passwords
# Create dedicated user for govdoc ingestion
govdoc_ingest:
  hash: "$2y$12$YOUR_HASHED_PASSWORD"
  reserved: false
  backend_roles: []
  description: "GovDoc ingestion user"
```

**Minimal Role Configuration:**

```yaml
# roles.yml - Add govdoc_ingest_role
govdoc_ingest_role:
  cluster_permissions:
    - "indices:admin/create"
    - "cluster:admin/aliases"
    - "cluster:monitor/health"
  index_permissions:
    - index_patterns:
        - "govdoc-companies-*"
      allowed_actions:
        - "indices:data/write/index"
        - "indices:data/write/bulk"
        - "indices:data/write/update"
        - "indices:admin/refresh"
        - "indices:admin/mapping/put"
        - "indices:admin/rollover"

# roles_mapping.yml
govdoc_ingest_role:
  backend_roles: []
  hosts: []
  users:
    - "govdoc_ingest"
```

#### 3. Network Security

```bash
# Firewall configuration (UFW example)
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 9200/tcp    # OpenSearch REST API
ufw allow 9300/tcp    # OpenSearch transport (if clustering later)
ufw allow from YOUR_APPLICATION_SERVER_IP to any port 9200
```

### Single Node Configuration

#### opensearch.yml (Minimal Production)

```yaml
# Cluster
cluster.name: govdoc-production
node.name: govdoc-node-01
node.roles: [cluster_manager, data, ingest]

# Network
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# Discovery (single node)
discovery.type: single-node
cluster.initial_cluster_manager_nodes: ["govdoc-node-01"]

# Memory
bootstrap.memory_lock: true

# Paths
path.data: /var/lib/opensearch/data
path.logs: /var/log/opensearch

# Security (using proper certificates)
plugins.security.ssl.transport.enabled: true
plugins.security.ssl.http.enabled: true
plugins.security.ssl.transport.enforce_hostname_verification: false
plugins.security.ssl.http.enforce_hostname_verification: false

# Disable unnecessary features for minimal setup
plugins.security.audit.type: noop
plugins.security.compliance.history.external_config_enabled: false
action.auto_create_index: false
```

#### JVM Settings (Critical for Performance)

```bash
# /etc/opensearch/jvm.options
-Xms8g  # 50% of system RAM (for 16GB system)
-Xmx8g  # Same as Xms
-XX:+UseG1GC
-XX:+DisableExplicitGC
-Djava.io.tmpdir=/var/lib/opensearch/tmp
```

### Deployment Steps

#### 1. Install OpenSearch

```bash
# Download and install OpenSearch 3.1.0
curl -O https://artifacts.opensearch.org/releases/bundle/opensearch/3.1.0/opensearch-3.1.0-linux-x64.tar.gz
tar -xzf opensearch-3.1.0-linux-x64.tar.gz
sudo mv opensearch-3.1.0 /opt/opensearch
sudo useradd -M -r -d /opt/opensearch opensearch
sudo chown -R opensearch:opensearch /opt/opensearch
```

#### 2. Setup Systemd Service

```bash
# /etc/systemd/system/opensearch.service
[Unit]
Description=OpenSearch
Documentation=https://opensearch.org/docs/
Wants=network-online.target
After=network-online.target

[Service]
Type=notify
RuntimeDirectory=opensearch
PrivateTmp=true
Environment=OPENSEARCH_HOME=/opt/opensearch
Environment=OPENSEARCH_PATH_CONF=/etc/opensearch
ExecStart=/opt/opensearch/bin/opensearch
StandardOutput=journal
StandardError=inherit
SyslogIdentifier=opensearch
User=opensearch
Group=opensearch
LimitNOFILE=65536
LimitNPROC=4096
LimitAS=infinity
LimitFSIZE=infinity
TimeoutStopSec=0
KillMode=process
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable opensearch
sudo systemctl start opensearch
```

#### 3. Initialize Index Structure

```bash
# Install company index template
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X PUT https://localhost:9200/_index_template/govdoc-companies-template \
  --data-binary @/path/to/company-index-template.json

# Create initial index with aliases
curl -k -u admin:YourStrongPassword123! \
  -X PUT https://localhost:9200/govdoc-companies-000001

# Setup aliases for index management
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X POST https://localhost:9200/_aliases -d '{
  "actions": [
    {"add": {"index": "govdoc-companies-000001", "alias": "govdoc-companies-write", "is_write_index": true}},
    {"add": {"index": "govdoc-companies-000001", "alias": "govdoc-companies"}}
  ]
}'
```

#### 4. Setup Backups (Critical)

```bash
# Create backup repository (filesystem)
sudo mkdir -p /backup/opensearch
sudo chown opensearch:opensearch /backup/opensearch

# Register backup repository
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X PUT https://localhost:9200/_snapshot/govdoc-backup-repo -d '{
  "type": "fs",
  "settings": {
    "location": "/backup/opensearch",
    "compress": true,
    "max_snapshot_bytes_per_sec": "50mb",
    "max_restore_bytes_per_sec": "50mb"
  }
}'

# Daily backup cron job
cat > /etc/cron.d/opensearch-backup << 'EOF'
# Daily OpenSearch backup at 2 AM
0 2 * * * root /usr/local/bin/opensearch-backup.sh
EOF
```

#### 5. Backup Script

```bash
# /usr/local/bin/opensearch-backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d)
SNAPSHOT_NAME="govdoc-daily-${DATE}"
OPENSEARCH_URL="https://localhost:9200"
AUTH="admin:YourStrongPassword123!"

# Create snapshot
curl -k -u "${AUTH}" \
  -H 'Content-Type: application/json' \
  -X PUT "${OPENSEARCH_URL}/_snapshot/govdoc-backup-repo/${SNAPSHOT_NAME}?wait_for_completion=false" -d '{
  "indices": "govdoc-companies-*",
  "ignore_unavailable": true,
  "include_global_state": false,
  "metadata": {
    "taken_by": "automated-backup",
    "taken_because": "daily backup"
  }
}'

# Cleanup old backups (keep 30 days)
find /backup/opensearch -name "govdoc-daily-*" -mtime +30 -delete

sudo chmod +x /usr/local/bin/opensearch-backup.sh
```

### Application Integration

#### Production Environment Variables

```bash
# /etc/environment or application .env
OPENSEARCH_URL=https://your-server.example.com:9200
OPENSEARCH_USERNAME=govdoc_ingest
OPENSEARCH_PASSWORD=YourStrongPassword123!
OPENSEARCH_INDEX=govdoc-companies-write
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_INSECURE=false  # Use proper certificates
OPENSEARCH_TIMEOUT_MS=30000
```

#### Connection Validation

```bash
# Test connection from application server
curl -k -u govdoc_ingest:YourStrongPassword123! \
  https://your-server.example.com:9200/_cluster/health

# Expected response: {"status":"green",...}
```

---

## Phase 2: Monitoring & Operations (Day 2)

### Health Monitoring

#### Basic Health Checks

```bash
# /usr/local/bin/opensearch-health-check.sh
#!/bin/bash
OPENSEARCH_URL="https://localhost:9200"
AUTH="admin:YourStrongPassword123!"

# Cluster health
HEALTH=$(curl -s -k -u "${AUTH}" "${OPENSEARCH_URL}/_cluster/health" | jq -r .status)
echo "Cluster Health: $HEALTH"

# Disk usage
DISK_USAGE=$(df -h /var/lib/opensearch | tail -1 | awk '{print $5}' | sed 's/%//')
echo "Disk Usage: ${DISK_USAGE}%"

if [ "$HEALTH" != "green" ] || [ "$DISK_USAGE" -gt 80 ]; then
  echo "ALERT: OpenSearch needs attention" | mail -s "OpenSearch Alert" admin@yourcompany.com
fi
```

#### Log Rotation

```bash
# /etc/logrotate.d/opensearch
/var/log/opensearch/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 opensearch opensearch
    postrotate
        systemctl reload opensearch
    endscript
}
```

### Performance Tuning (Minimal)

#### Index Settings for GovDoc Data

```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "30s",
    "index.mapping.total_fields.limit": 2000,
    "index.max_result_window": 50000,
    "index.query.default_field": ["company_name", "description"]
  }
}
```

#### Index Rollover Policy

```bash
# Create rollover policy for large datasets
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X PUT https://localhost:9200/_plugins/_ism/policies/govdoc-rollover-policy -d '{
  "policy": {
    "description": "GovDoc companies rollover policy",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_index_age": "180d",
              "min_doc_count": 5000000,
              "min_primary_shard_size": "50gb"
            }
          }
        ],
        "transitions": []
      }
    ]
  }
}'
```

---

## Phase 3: High Availability (Scale-Up)

### When to Scale

**Scale when you hit ANY of these limits:**

- Disk usage > 80%
- Search response time > 2 seconds
- Index size > 50GB per shard
- CPU usage consistently > 80%
- Memory pressure warnings

### 3-Node Cluster Configuration

#### Node Configurations

```yaml
# Node 1: govdoc-node-01 (Master + Data)
cluster.name: govdoc-production
node.name: govdoc-node-01
node.roles: [cluster_manager, data, ingest]
discovery.seed_hosts: ["10.0.1.1", "10.0.1.2", "10.0.1.3"]
cluster.initial_cluster_manager_nodes: ["govdoc-node-01", "govdoc-node-02", "govdoc-node-03"]

# Node 2: govdoc-node-02 (Master + Data)
cluster.name: govdoc-production
node.name: govdoc-node-02
node.roles: [cluster_manager, data, ingest]
discovery.seed_hosts: ["10.0.1.1", "10.0.1.2", "10.0.1.3"]
cluster.initial_cluster_manager_nodes: ["govdoc-node-01", "govdoc-node-02", "govdoc-node-03"]

# Node 3: govdoc-node-03 (Master + Data)
cluster.name: govdoc-production
node.name: govdoc-node-03
node.roles: [cluster_manager, data, ingest]
discovery.seed_hosts: ["10.0.1.1", "10.0.1.2", "10.0.1.3"]
cluster.initial_cluster_manager_nodes: ["govdoc-node-01", "govdoc-node-02", "govdoc-node-03"]
```

#### Update Index Settings for HA

```bash
# Enable replicas for fault tolerance
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X PUT https://localhost:9200/govdoc-companies-*/_settings -d '{
  "settings": {
    "number_of_replicas": 1
  }
}'
```

---

## Operational Procedures

### Daily Tasks

```bash
# Health check
curl -k -u admin:YourStrongPassword123! https://localhost:9200/_cluster/health

# Disk usage
df -h /var/lib/opensearch

# Document count
curl -k -u admin:YourStrongPassword123! https://localhost:9200/govdoc-companies/_count
```

### Weekly Tasks

```bash
# Review logs for errors
journalctl -u opensearch --since "1 week ago" | grep ERROR

# Check backup status
curl -k -u admin:YourStrongPassword123! https://localhost:9200/_snapshot/govdoc-backup-repo/_all

# Index statistics
curl -k -u admin:YourStrongPassword123! https://localhost:9200/_cat/indices/govdoc-companies-*?v
```

### Emergency Procedures

#### Restore from Backup

```bash
# List available snapshots
curl -k -u admin:YourStrongPassword123! \
  https://localhost:9200/_snapshot/govdoc-backup-repo/_all

# Restore specific snapshot
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X POST https://localhost:9200/_snapshot/govdoc-backup-repo/govdoc-daily-20250822/_restore -d '{
  "indices": "govdoc-companies-*",
  "ignore_unavailable": true,
  "include_global_state": false
}'
```

#### Index Rollover (Manual)

```bash
# Check if rollover needed
curl -k -u admin:YourStrongPassword123! \
  https://localhost:9200/govdoc-companies-write/_stats

# Manual rollover
curl -k -u admin:YourStrongPassword123! \
  -H 'Content-Type: application/json' \
  -X POST https://localhost:9200/govdoc-companies-write/_rollover -d '{
  "conditions": {
    "max_docs": 5000000,
    "max_age": "180d",
    "max_primary_shard_size": "50gb"
  }
}'
```

---

## Security Checklist

### Pre-Production Security Audit

- [ ] **Certificates**: Replace ALL demo certificates with proper CA-signed certificates
- [ ] **Passwords**: Change ALL default passwords to strong, unique passwords
- [ ] **Firewall**: Restrict network access to necessary IPs only
- [ ] **Users**: Create dedicated service accounts with minimal permissions
- [ ] **TLS**: Enable TLS for both transport and HTTP layers
- [ ] **Audit**: Configure audit logging for compliance (if required)
- [ ] **Backups**: Test backup and restore procedures
- [ ] **Updates**: Plan for security updates and patches

### Post-Deployment Security Tasks

- [ ] **Monitoring**: Set up health and security monitoring
- [ ] **Log Analysis**: Regularly review security logs
- [ ] **Access Review**: Quarterly review of user access and permissions
- [ ] **Certificate Renewal**: Set up certificate renewal procedures
- [ ] **Incident Response**: Document incident response procedures

---

## Cost Optimization

### Single Node Sizing Guidelines

```
Small Dataset (< 1M documents, < 10GB):
- CPU: 4 vCPUs
- RAM: 16 GB
- Disk: 100 GB SSD
- Cost: ~$150-300/month (cloud)

Medium Dataset (1M-10M documents, 10-100GB):
- CPU: 8 vCPUs
- RAM: 32 GB
- Disk: 500 GB SSD
- Cost: ~$400-800/month (cloud)

Large Dataset (>10M documents, >100GB):
- CPU: 16 vCPUs
- RAM: 64 GB
- Disk: 1 TB SSD
- Cost: ~$800-1500/month (cloud)
```

### Resource Monitoring Thresholds

```bash
# Set alerts for these thresholds:
CPU Usage: > 80% sustained
Memory Usage: > 85% heap
Disk Usage: > 80% total
Search Latency: > 2 seconds P95
Indexing Rate: < 100 docs/sec (if expected higher)
```

---

## Upgrade Path

### Minor Version Updates (3.1.x → 3.1.y)

1. **Backup** cluster data
2. **Stop** OpenSearch service
3. **Replace** binaries
4. **Start** OpenSearch service
5. **Verify** cluster health

### Major Version Updates (3.x → 4.x)

1. **Plan** maintenance window
2. **Full backup** of cluster and configuration
3. **Test** upgrade in staging environment
4. **Rolling update** (for HA clusters)
5. **Verify** all applications work correctly

---

## Success Metrics

### Technical Metrics

- **Uptime**: > 99.9%
- **Search Latency**: < 500ms P95
- **Index Throughput**: > 1000 docs/sec
- **Storage Growth**: Predictable and monitored
- **Backup Success**: 100% success rate

### Business Metrics

- **Data Freshness**: Documents indexed within 1 hour
- **Search Accuracy**: Relevant results for company searches
- **User Satisfaction**: Positive feedback on search experience
- **Cost Efficiency**: Stays within budget projections

---

## Summary

This minimal production plan provides:

1. **Security-first** approach with proper TLS and authentication
2. **Single-node start** with clear scale-up path
3. **Automated backups** and disaster recovery procedures
4. **Monitoring and alerting** for operational awareness
5. **Cost-optimized** resource sizing
6. **Battle-tested** configurations based on OpenSearch best practices

**Next Steps:**

1. Implement Phase 1 (Single Node Production)
2. Monitor for 2-4 weeks to establish baseline
3. Scale to Phase 3 (HA) when growth demands it
4. Implement additional features (dashboards, advanced analytics) as needed

**Key Philosophy**: Start minimal, secure, and reliable. Add complexity only when business value justifies operational overhead.
