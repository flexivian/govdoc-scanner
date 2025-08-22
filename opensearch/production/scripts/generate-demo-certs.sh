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
