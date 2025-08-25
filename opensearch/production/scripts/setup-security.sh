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

# Function to generate strong password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

echo -e "${YELLOW}Step 1: Generating secure passwords...${NC}"

# Generate passwords
ADMIN_PASSWORD=$(generate_password)
KIBANA_PASSWORD=$(generate_password)
GOVDOC_INGEST_PASSWORD=$(generate_password)

echo -e "${GREEN}✓ Generated secure passwords${NC}"

echo -e "\n${YELLOW}Step 2: Creating environment file...${NC}"

# Create production environment file
cat > .env << EOF
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
EOF

echo -e "${GREEN}✓ Created .env file${NC}"

echo -e "\n${YELLOW}Step 3: Hashing passwords for internal users...${NC}"

# Check if Node.js and bcryptjs are available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required but not found. Please install Node.js.${NC}"
    exit 1
fi

# Check if we're in the project root with bcryptjs installed
cd ../.. # Go to project root to access node_modules
if ! node -e "require('bcryptjs')" &> /dev/null 2>&1; then
    echo -e "${YELLOW}Installing bcryptjs for password hashing...${NC}"
    npm install bcryptjs > /dev/null 2>&1
fi
cd opensearch/production # Return to production directory

# Run the password hashing script
if node scripts/hash-passwords.mjs; then
    echo -e "${GREEN}✓ Generated password hashes and updated internal_users.yml${NC}"
else
    echo -e "${RED}Error: Failed to hash passwords${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 4: Creating security configuration files...${NC}"

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
  - "cluster:monitor/health"
  - "indices:data/write/bulk"
  - "indices:data/write/bulk*"
  - "indices:admin/auto_create"
  - "cluster:admin/ingest/pipeline/get"
  - "indices:admin/aliases/get"
  - "indices:admin/aliases/exists"
  index_permissions:
  - index_patterns:
    - "govdoc-companies-*"
    - "govdoc-companies-write"
    allowed_actions:
    - "indices:data/write/index"
    - "indices:data/write/bulk"
    - "indices:data/write/bulk*"
    - "indices:data/write/update"
    - "indices:data/write/delete"
    - "indices:data/read/search"
    - "indices:data/read/get"
    - "indices:admin/create"
    - "indices:admin/auto_create"
    - "indices:admin/aliases"
    - "indices:admin/aliases/get"
    - "indices:admin/aliases/exists"
    - "indices:admin/mapping/put"
    - "indices:admin/mappings/fields/get"
    - "indices:admin/mappings/get"
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

# Generate certificate with SAN and proper key usage
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
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment, keyAgreement
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = node.example.com
DNS.3 = opensearch-prod
IP.1 = 127.0.0.1
CONF

openssl x509 -req -in node.csr -CA root-ca.pem -CAkey root-ca-key.pem -CAcreateserial \
    -out node.pem -days 365 -extensions v3_req -extfile node.conf

# Generate admin certificate with proper key usage
cat > admin.conf << 'CONF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = DE
L = Test
O = Test
OU = SSL
CN = admin

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment, keyAgreement
extendedKeyUsage = clientAuth
CONF

openssl genrsa -out admin-key-temp.pem 2048
openssl pkcs8 -inform PEM -outform PEM -in admin-key-temp.pem -topk8 -nocrypt -v1 PBE-SHA1-3DES -out admin-key.pem
openssl req -new -key admin-key.pem -out admin.csr -config admin.conf
openssl x509 -req -in admin.csr -CA root-ca.pem -CAkey root-ca-key.pem -CAcreateserial \
    -out admin.pem -days 365 -extensions v3_req -extfile admin.conf

# Cleanup
rm node-key-temp.pem admin-key-temp.pem node.csr admin.csr node.conf admin.conf

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
echo -e "3. Configuration saved to: .env"
echo ""
echo -e "${RED}CRITICAL SECURITY WARNINGS:${NC}"
echo -e "1. ${RED}Change demo certificates before production use${NC}"
echo -e "2. ${RED}Store passwords securely (use secrets management)${NC}"
echo -e "3. ${RED}Never commit .env to version control${NC}"
echo -e "4. ${RED}Set up proper firewall rules${NC}"
echo -e "5. ${RED}Enable audit logging for compliance${NC}"
echo ""
