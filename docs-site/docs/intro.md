---
sidebar_position: 1
---

# What is GovDoc Scanner?

### The Problem

In Greece, essential public company data exists in thousands of unstructured documents across the [Γ.Ε.ΜΗ. (GEMI)](https://publicity.businessportal.gr) portal. This creates significant barriers for:

- **Citizens** seeking transparency in corporate activities
- **Researchers** analyzing business trends and economic patterns
- **Policymakers** requiring data-driven insights for legislation
- **Journalists** investigating corporate structures and ownership

The current format limits transparency and makes systematic analysis nearly impossible.

### The Solution

**GovDoc Scanner** is an open-source tool designed to convert unstructured GEMI portal PDFs into a fully searchable database accessible via a REST API. It automates the complete document processing pipeline with **AI-powered extraction** and **production-ready infrastructure**:

- **Smart Crawling**: Automated document discovery and download from GEMI portal with advanced filtering
- **AI Extraction**: Google Gemini 2.5 Flash processes Greek legal documents with specialized prompts
- **Structured Data**: Comprehensive metadata extraction including representatives, ownership, and change tracking
- **Full-Text Search**: OpenSearch integration with Greek language analyzers for powerful querying
- **REST API**: Production-ready server with authentication, rate limiting, and comprehensive documentation

## Architecture & Components

GovDoc Scanner follows a **modern monorepo architecture** with five specialized applications:

### Core Applications

- **`cli`**: A unified command-line interface that orchestrates the complete workflow, combining crawling and scanning with interactive prompts and automated batch processing (recommended for most users).
- **`doc-scanner`**: Processes `.pdf`, `.doc` and `.docx` documents for a given GEMI company, extracting comprehensive metadata with chronological processing and intelligent representative tracking using Gemini 2.5 Flash Lite.
- **`crawler`**: Scrapes the GEMI portal to search for companies using advanced filters and downloads all available public documents with enhanced date extraction, intelligent file management, and robust retry mechanisms.
- **`api`**: Fastify-based REST API server providing search endpoints for companies and representatives with OpenSearch integration.
- **`opensearch`**: Complete OpenSearch integration with development and production configurations for searchable data indexing.

## Technology Stack

**Core Technologies:**

- **Node.js v20+**: Modern JavaScript runtime with ES modules
- **Google Gemini 2.5 Flash**: Specialized AI for Greek legal document processing
- **OpenSearch 3.1+**: Full-text search with Greek language analyzers
- **Fastify**: High-performance web framework with built-in validation
- **Playwright**: Robust web automation for document crawling
- **Docker**: Containerized deployment and development environments

**Development & Operations:**

- **NPM Workspaces**: Monorepo management for multiple applications
- **ESLint & Prettier**: Code quality and formatting standards
- **Docusaurus**: Documentation site with live reloading
- **GitHub Actions**: Automated testing and deployment workflows

## Getting Started

Ready to process Greek company documents? Choose your path:

- **[Installation Guide](./installation/Getting%20Started.md)**: System requirements and setup
- **[Development Setup](./installation/Development.md)**: Contributing and customization

## Something Missing? {#something-missing}

If something is missing in the documentation or if you found some part confusing, please click on **edit this Page** and create a PR for improvement. We love your contribution!
