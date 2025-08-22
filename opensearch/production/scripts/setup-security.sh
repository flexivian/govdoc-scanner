#!/bin/bash

# Production Security Setup Script for GovDoc Scanner OpenSearch
# This script generates secure passwords and creates security configuration

set -e

echo "=== GovDoc Scanner - Production Security Setup ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate strong password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to hash password for OpenSearch internal users
hash_password() {
    local password="$1"
    # Using bcrypt with cost 12 (production strength)
    python3 -c "import bcrypt; print(bcrypt.hashpw(b'$password', bcrypt.gensalt(rounds=12)).decode())"
}

echo -e "${YELLOW}Step 1: Generating secure passwords...${NC}"

# Generate passwords
ADMIN_PASSWORD=$(generate_password)
KIBANA_PASSWORD=$(generate_password)
GOVDOC_INGEST_PASSWORD=$(generate_password)

echo -e "${GREEN}✓ Generated secure passwords${NC}"

echo -e "\n${YELLOW}Step 2: Creating environment file...${NC}"

# Create production environment file
cat > ../production.env << EOF
# Production Environment Variables for GovDoc Scanner OpenSearch
# Generated on: $(date)
# 
# SECURITY WARNING: Keep this file secure and never commit to version control

# OpenSearch Admin Password (for administration)
OPENSEARCH_PROD_ADMIN_PASSWORD=${ADMIN_PASSWORD}

# OpenSearch Dashboards Service Password
OPENSEARCH_PROD_KIBANA_PASSWORD=${KIBANA_PASSWORD}

# GovDoc Application Password (for data ingestion)
OPENSEARCH_PROD_GOVDOC_PASSWORD=${GOVDOC_INGEST_PASSWORD}

# Application Configuration
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=govdoc_ingest
OPENSEARCH_PASSWORD=${GOVDOC_INGEST_PASSWORD}
OPENSEARCH_INDEX=govdoc-companies-write
OPENSEARCH_BATCH_SIZE=500
OPENSEARCH_INSECURE=true  # Set to false when using proper certificates
OPENSEARCH_TIMEOUT_MS=30000
EOF

echo -e "${GREEN}✓ Created production.env file${NC}"

echo -e "\n${YELLOW}Step 3: Hashing passwords for internal users...${NC}"

# Check if Python3 and bcrypt are available
if ! command -v python3 &> /dev/null || ! python3 -c "import bcrypt" &> /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Python3 or bcrypt not available. Using simpler hash method.${NC}"
    ADMIN_HASH="\$2a\$12\$VcCDgh2NDk07JGN0rjGbM.Ad41qVR/YFJcgHp0UGns5JDymv..TOG"
    KIBANA_HASH="\$2a\$12\$4AcgAt3xwOWadA5s5blL6ev39OXDNhmOesEoo33eZtrq2N0YrU3H."
    GOVDOC_HASH="\$2a\$12\$JJSXNfTowz7Uu5ttXfeYpeYE0arACvcwlPBStB1F.MI7f0U9Z5DGC"
    echo -e "${YELLOW}Using default hashes - remember to change passwords after setup${NC}"
else
    ADMIN_HASH=$(hash_password "$ADMIN_PASSWORD")
    KIBANA_HASH=$(hash_password "$KIBANA_PASSWORD")
    GOVDOC_HASH=$(hash_password "$GOVDOC_INGEST_PASSWORD")
    echo -e "${GREEN}✓ Generated password hashes${NC}"
fi

echo -e "\n${YELLOW}Step 4: Creating security configuration files...${NC}"

# Create internal users configuration
cat > config/internal_users.yml << EOF
# Production Internal Users Configuration
# Generated on: $(date)

_meta:
  type: "internalusers"
  config_version: 2

# Admin user (for cluster administration)
admin:
  hash: "${ADMIN_HASH}"
  reserved: true
  backend_roles:
  - "admin"
  description: "Admin user for cluster management"

# Kibana server user (for Dashboards communication)
kibanaserver:
  hash: "${KIBANA_HASH}"
  reserved: true
  description: "Kibana server user"

# GovDoc ingestion user (for application data ingestion)
govdoc_ingest:
  hash: "${GOVDOC_HASH}"
  reserved: false
  backend_roles: []
  description: "GovDoc application user for data ingestion"
  attributes:
    created_by: "production-setup"
    purpose: "data-ingestion"
EOF

# Create roles configuration
cat > config/roles.yml << EOF
# Production Roles Configuration
# Generated on: $(date)

_meta:
  type: "roles"
  config_version: 2

# GovDoc ingestion role - minimal permissions for data ingestion
govdoc_ingest_role:
  reserved: false
  cluster_permissions:
  - "indices:admin/create"
  - "cluster:admin/aliases"
  - "cluster:monitor/health"
  - "cluster:monitor/stats"
  index_permissions:
  - index_patterns:
    - "govdoc-companies-*"
    allowed_actions:
    - "indices:data/write/index"
    - "indices:data/write/bulk"
    - "indices:data/write/update"
    - "indices:data/write/delete"
    - "indices:admin/refresh"
    - "indices:admin/mapping/put"
    - "indices:admin/rollover"
    - "indices:data/read/search"
    - "indices:data/read/get"
  description: "Role for GovDoc application data ingestion"

# Read-only role for queries (future use)
govdoc_read_role:
  reserved: false
  cluster_permissions:
  - "cluster:monitor/health"
  - "cluster:monitor/stats"
  index_permissions:
  - index_patterns:
    - "govdoc-companies-*"
    allowed_actions:
    - "indices:data/read/search"
    - "indices:data/read/get"
    - "indices:data/read/scroll"
  description: "Read-only role for GovDoc queries"
EOF

# Create roles mapping configuration
cat > config/roles_mapping.yml << EOF
# Production Roles Mapping Configuration  
# Generated on: $(date)

_meta:
  type: "rolesmapping"
  config_version: 2

# Map admin backend role to all_access
all_access:
  reserved: false
  backend_roles:
  - "admin"
  description: "Maps admin backend role to all_access"

# Map kibana server role
kibana_server:
  reserved: true
  users:
  - "kibanaserver"

# Map govdoc ingestion role
govdoc_ingest_role:
  reserved: false
  users:
  - "govdoc_ingest"
  description: "Maps govdoc_ingest user to ingestion role"
EOF

echo -e "${GREEN}✓ Created security configuration files${NC}"

echo -e "\n${YELLOW}Step 5: Setting up certificates...${NC}"

# Check if we're in a container or need to generate certificates
if [ ! -f "certs/root-ca.pem" ]; then
    echo -e "${YELLOW}Generating demo certificates (REPLACE IN PRODUCTION!)${NC}"
    
    # Create certificates directory structure
    mkdir -p certs
    
    # For now, we'll use demo certificates but warn the user
    echo -e "${RED}WARNING: Using demo certificates!${NC}"
    echo -e "${RED}In production, replace these with proper CA-signed certificates${NC}"
    
    # Create a script to generate demo certificates
    cat > scripts/generate-demo-certs.sh << 'EOF'
#!/bin/bash
# Demo certificate generation script
# WARNING: Only for development/testing

cd certs

# Generate root CA
openssl genrsa -out root-ca-key.pem 2048
openssl req -new -x509 -sha256 -key root-ca-key.pem -out root-ca.pem -days 3650 \
    -subj "/C=US/ST=CA/L=SF/O=GovDoc/OU=IT/CN=root-ca"

# Generate node certificate
openssl genrsa -out node-key-temp.pem 2048
openssl pkcs8 -inform PEM -outform PEM -in node-key-temp.pem -topk8 -nocrypt -v1 PBE-SHA1-3DES -out node-key.pem
openssl req -new -key node-key.pem -out node.csr \
    -subj "/C=US/ST=CA/L=SF/O=GovDoc/OU=IT/CN=node.example.com"

# Generate certificate with SAN
cat > node.conf << 'CONF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = SF
O = GovDoc
OU = IT
CN = node.example.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = node.example.com
DNS.3 = opensearch-prod
IP.1 = 127.0.0.1
CONF

openssl x509 -req -in node.csr -CA root-ca.pem -CAkey root-ca-key.pem -CAcreateserial \
    -out node.pem -days 365 -extensions v3_req -extfile node.conf

# Generate admin certificate
openssl genrsa -out admin-key-temp.pem 2048
openssl pkcs8 -inform PEM -outform PEM -in admin-key-temp.pem -topk8 -nocrypt -v1 PBE-SHA1-3DES -out admin-key.pem
openssl req -new -key admin-key.pem -out admin.csr \
    -subj "/C=DE/L=Test/O=Test/OU=SSL/CN=admin"
openssl x509 -req -in admin.csr -CA root-ca.pem -CAkey root-ca-key.pem -CAcreateserial \
    -out admin.pem -days 365

# Cleanup
rm node-key-temp.pem admin-key-temp.pem node.csr admin.csr node.conf

echo "Demo certificates generated!"
echo "WARNING: Replace these with proper certificates in production!"
EOF

    chmod +x scripts/generate-demo-certs.sh
    ./scripts/generate-demo-certs.sh
fi

echo -e "${GREEN}✓ Certificate setup completed${NC}"

echo -e "\n${GREEN}=== Production Security Setup Complete ===${NC}"
echo ""
echo -e "${YELLOW}Important Security Information:${NC}"
echo -e "1. Admin Password: ${ADMIN_PASSWORD}"
echo -e "2. GovDoc Ingest Password: ${GOVDOC_INGEST_PASSWORD}"
echo -e "3. Configuration saved to: production.env"
echo ""
echo -e "${RED}CRITICAL SECURITY WARNINGS:${NC}"
echo -e "1. ${RED}Change demo certificates before production use${NC}"
echo -e "2. ${RED}Store passwords securely (use secrets management)${NC}"
echo -e "3. ${RED}Never commit production.env to version control${NC}"
echo -e "4. ${RED}Set up proper firewall rules${NC}"
echo -e "5. ${RED}Enable audit logging for compliance${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "1. Review and customize config files"
echo -e "2. Start the cluster: docker-compose -f docker-compose.prod.yml up -d"
echo -e "3. Initialize indices and templates"
echo -e "4. Test the setup"
echo ""
