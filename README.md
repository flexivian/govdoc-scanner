# govdoc-scanner

[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://flexivian.github.io/govdoc-scanner/)
[![GitHub](https://img.shields.io/badge/GitHub-govdoc--scanner-green)](https://github.com/flexivian/govdoc-scanner)

## 📚 Documentation

**📖 [View Complete Documentation →](https://flexivian.github.io/govdoc-scanner/)**

For detailed documentation, including setup guides, API references, contribution guidelines, and GSoC 2025 information, visit our comprehensive documentation site.

## Project Overview

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

## Current Functionality/Implementation

The repository currently includes five main applications:

- **cli**: A unified command-line interface that orchestrates the complete workflow, combining crawling and scanning with interactive prompts and automated batch processing (recommended for most users).
- **doc-scanner**: Processes `.pdf`, `.doc` and `.docx` documents for a given GEMI company, extracting comprehensive metadata with chronological processing and intelligent representative tracking using Gemini 2.5 Flash Lite.
- **crawler**: Scrapes the GEMI portal to search for companies using advanced filters and downloads all available public documents with enhanced date extraction, intelligent file management, and robust retry mechanisms.
- **api**: Fastify-based REST API server providing search endpoints for companies and representatives with OpenSearch integration.
- **opensearch**: Complete OpenSearch integration with development and production configurations for searchable data indexing.

All applications are organized under the `apps/` directory for better project structure and maintainability.

All tools are implemented in Node.js and use a combination of CLI interfaces and automated scripts. The project uses npm workspaces for managing multiple applications.

## Usage Instructions

### Requirements

- **Node.js**: v18.x or newer (recommended: v20.x)
  Check your versions with:

```sh
node --version
```

- **Docker & Docker Compose** (optional, for OpenSearch and RESTAPI): Required only if using the OpenSearch integration for search and analytics.

- **.env file**: Copy the example environment file and update it with your Gemini API key:

```sh
cp .env.example .env
```

Then, open `.env` and set:

```
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Set custom working directory (default: ~/.govdoc)
WORKING_DIR=~/.govdoc
```

### Quick Start

1. **Install Dependencies**

   ```sh
   npm install
   ```

2. **Run the Tool** (choose one of the following)

   **Most Common Usage - Interactive Workflow:**

   ```sh
   npm start govdoc
   ```

   This runs an interactive CLI that guides you through the complete workflow. Use `--` to pass args.

   **Just Search & Download Documents:**

   ```sh
   npm start crawler
   ```

   **Just Process Existing Documents:**

   ```sh
   npm start scanner
   ```

   **Get Help:**

   ```sh
   npm start help
   ```

### Detailed Usage

### 1. Interactive Workflow (Recommended)

```sh
npm start govdoc
```

This launches an interactive CLI that guides you through the process:

- **File Input**: Process GEMI IDs from a .gds file
- **Manual Entry**: Enter specific GEMI IDs directly
- **Random Selection**: Process random companies with date-based search filters

### 2. Command Line Usage (for automation)

```sh
# Process from file
npm start govdoc -- --input ./companies.gds

# Process random companies
npm start govdoc -- --company-random 10

# Show help
npm start govdoc -- --help
```

The command line mode:

- Runs without interactive prompts (perfect for automation)
- Accepts the same input methods as interactive mode
- Provides the same processing and output capabilities
- Shows progress tracking and comprehensive summary

Both modes:

- Show clear progress tracking with visual indicators
- Provide comprehensive summary when complete
- Save output in organized working directories (default: `~/.govdoc/`)

### 3. Manual Workflow

If you prefer to run each step separately, make sure to use `LOG_LEVEL=DEBUG` for detailed output when running the separate apps:

**Step 1: Search & Download**

```sh
npm start crawler
```

- Use the interactive CLI to search for companies or download documents by GEMI ID(s)
- Results are saved in `~/.govdoc/crawler/downloads/{GEMI_ID}/` (or custom `WORKING_DIR`)

**Step 2: Process Documents**

```sh
npm start scanner
```

- Place documents in `~/.govdoc/doc-scanner/input/{GEMI_ID}/` (or custom `WORKING_DIR`)
- Output is generated in `~/.govdoc/doc-scanner/output/{GEMI_ID}/`

### Alternative Commands

You can also run commands directly:

- `npm run crawler` (same as `npm start crawler`)
- `npm run scanner` (same as `npm start scanner`)
- `npm run govdoc` (same as `npm start govdoc`)

## OpenSearch + REST API integration

- **Quick Setup**: Read `apps/opensearch/README.md`
- **Detailed Guide**: [OpenSearch Installation Documentation](https://flexivian.github.io/govdoc-scanner/docs/installation/OpenSearch)

- **Quick Setup**: Read `apps/api/README.md`
- **Detailed Guide**: [REST API Installation Documentation](https://flexivian.github.io/govdoc-scanner/docs/installation/REST-API)

## Features Offered

- **Unified CLI Tool**: Complete end-to-end workflow with both interactive and command-line modes for different use cases and automation needs.
- **Automated Document Downloading**: Bulk or single download of all public documents for any Greek company listed in GEMI with enhanced date extraction for proper filename organization.
- **Advanced Company Search**: Filter by name, legal type, status, location, and more.
- **Intelligent Metadata Extraction**: Uses Gemini 2.5 Flash Lite for accurate extraction of company information, representative details, and ownership data from Greek legal documents.
- **Chronological Processing**: Processes documents in date order to track company evolution and changes over time.
- **Representative Tracking**: Accurately identifies company representatives, their active status, and ownership percentages with advanced duplicate prevention.
- **Change Tracking**: Automatically summarizes significant changes between document versions, including role changes, ownership transfers, and address updates with intelligent processing optimization.
- **Incremental Processing**: Skip processing when metadata indicates all documents are up to date, reducing unnecessary API calls and processing time.
- **Greek Legal Optimization**: Specialized for Greek corporate legal terminology and GEMI document structures.
- **Enhanced Reliability**: Robust retry mechanisms and improved error handling for stable operation.
- **Interactive CLI**: User-friendly command-line interfaces with guided prompts for all workflows.
- **Multiple Input Methods**: Support for file input, manual entry, and random selection with date-based search filters.
- **Progress Tracking**: Unified progress bar and summary for batch operations.
- **OpenSearch Integration**: Optional integration with OpenSearch 3.1+ for full-text search, analytics, and data visualization with automated index management and bulk operations.

## Documentation

This project includes comprehensive documentation built with [Docusaurus](https://docusaurus.io/). The documentation provides:

- **Getting Started Guide**: Step-by-step setup and usage instructions
- **Development Setup**: Detailed guide for contributors and developers
- **Code Examples**: Practical examples for each application component
- **GSoC 2025 Overview**: Project background and future roadmap

### Accessing the Documentation

**Online**: Visit the [project documentation site](https://flexivian.github.io/govdoc-scanner/)

**Local Development**: To run the documentation locally:

```bash
cd docs-site
npm install
npm start
```

The documentation site will be available at `http://localhost:3000` with live reloading for development.
