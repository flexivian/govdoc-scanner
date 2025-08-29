#!/usr/bin/env node

import bcrypt from "bcryptjs";
import { readFileSync, writeFileSync } from "fs";

// Read the .env file to get the generated passwords
const envContent = readFileSync(".env", "utf8");
const envLines = envContent.split("\n");

let adminPassword, kibanaPassword, govdocPassword;

for (const line of envLines) {
  if (line.startsWith("OPENSEARCH_PROD_ADMIN_PASSWORD=")) {
    adminPassword = line.split("=")[1];
  } else if (line.startsWith("OPENSEARCH_PROD_KIBANA_PASSWORD=")) {
    kibanaPassword = line.split("=")[1];
  } else if (line.startsWith("OPENSEARCH_PROD_GOVDOC_PASSWORD=")) {
    govdocPassword = line.split("=")[1];
  }
}

if (!adminPassword || !kibanaPassword || !govdocPassword) {
  console.error("Error: Could not find passwords in .env file");
  process.exit(1);
}

console.log("Hashing passwords with bcrypt...");

// Hash passwords with bcrypt (cost 12 for production strength)
const adminHash = bcrypt.hashSync(adminPassword, 12);
const kibanaHash = bcrypt.hashSync(kibanaPassword, 12);
const govdocHash = bcrypt.hashSync(govdocPassword, 12);

console.log("✓ Passwords hashed successfully");

// Generate the internal_users.yml content
const internalUsersContent = `# Production Internal Users Configuration
# Generated on: ${new Date().toLocaleString()}

_meta:
  type: "internalusers"
  config_version: 2

# Admin user (for cluster administration)
admin:
  hash: "${adminHash}"
  reserved: true
  backend_roles:
  - "admin"
  description: "Admin user for cluster management"

# Kibana server user (for Dashboards communication)
kibanaserver:
  hash: "${kibanaHash}"
  reserved: true
  description: "Kibana server user"

# GovDoc ingestion user (for application data ingestion)
govdoc_ingest:
  hash: "${govdocHash}"
  reserved: false
  backend_roles: []
  description: "GovDoc application user for data ingestion"
  attributes:
    created_by: "production-setup"
    purpose: "data-ingestion"
`;

// Write the updated internal_users.yml file
writeFileSync("config/internal_users.yml", internalUsersContent);

console.log(
  "✓ Updated config/internal_users.yml with properly hashed passwords"
);
