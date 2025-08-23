# govdoc-scanner

[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://flexivian.github.io/govdoc-scanner/)
[![GitHub](https://img.shields.io/badge/GitHub-govdoc--scanner-green)](https://github.com/flexivian/govdoc-scanner)

## 📚 Documentation

**📖 [View Complete Documentation →](https://flexivian.github.io/govdoc-scanner/)**

For detailed documentation, including setup guides, API references, contribution guidelines, and GSoC 2025 information, visit our comprehensive documentation site.

## Project Overview

In Greece, vital public company data is often locked in behind multiple custom templated PDF files, making it challenging for citizens, researchers, and policymakers to access and analyze this information. The current state of these documents limits transparency and hinders efficient data use. The govdoc-scanner project seeks to bridge this gap by transforming these PDFs into a structured, searchable database, thereby democratizing access to important corporate information.

The govdoc-scanner is an open-source tool designed to convert unstructured [Γ.Ε.ΜΗ.](https://www.businessportal.gr/) (GEMI) portal PDFs into a fully searchable database accessible via a REST API. It automates the extraction of metadata and document histories, making corporate information more accessible and useful for a wide range of users.

## Current Functionality/Implementation

The repository currently includes three main applications:

- **cli**: A unified command-line interface that orchestrates the complete workflow, combining crawling and scanning with interactive prompts and automated batch processing (recommended for most users).
- **doc-scanner**: Processes `.pdf`, `.doc` and `.docx` documents for a given GEMI company, extracting comprehensive metadata with chronological processing and intelligent representative tracking using Gemini 2.5 Flash Lite.
- **crawler**: Scrapes the GEMI portal to search for companies using advanced filters and downloads all available public documents with enhanced date extraction, intelligent file management, and robust retry mechanisms.

Optional integration:

- **OpenSearch**: Index your results for search/analytics with OpenSearch 3.1+. Includes a ready-to-use mapping template, CLI bulk push, and comprehensive documentation for local development.

All tools are implemented in Node.js and use a combination of CLI interfaces and automated scripts. The project uses npm workspaces for managing multiple applications.

## Usage Instructions

### Requirements

- **Node.js**: v18.x or newer (recommended: v20.x)
  Check your versions with:

```sh
node --version
```

- **Docker & Docker Compose** (optional, for OpenSearch): Required only if using the OpenSearch integration for search and analytics.

- **.env file**: Copy the example environment file and update it with your Gemini API key:

```sh
cp .env.example .env
```

Then, open `.env` and set:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

For OpenSearch integration, use environment-specific configuration:

**Development**: See `opensearch/development/.env.template`
**Production**: Run `opensearch/production/scripts/setup-security.sh`

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
- Save output in the `output/` directory

### 4. OpenSearch Integration (optional)

1. Start OpenSearch + Dashboards (Docker):

```bash
# Strong password required (8+ chars, rated "strong" by zxcvbn)
export OPENSEARCH_INITIAL_ADMIN_PASSWORD=MyStr0ngP@ssw0rd123!
docker compose up -d opensearch opensearch-dashboards
```

2. Install the index template and create the index:

```bash
curl -k -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD \
  -H 'content-type: application/json' \
  -X PUT https://localhost:9200/_index_template/govdoc-companies-template \
   --data-binary @opensearch/shared/templates/company-index-template.json

curl -k -u admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD -X PUT https://localhost:9200/govdoc-companies-000001
```

3. Push data from the CLI:

Interactive mode (reads OPENSEARCH\_\* from .env and OPENSEARCH_PUSH=true):

```bash
npm start govdoc
```

Command mode with flags:

```bash
npm start govdoc -- --input ./companies.gds \
   --push \
   --os.endpoint https://localhost:9200 \
   --os.username admin \
   --os.password MyStr0ngP@ssw0rd123! \
   --os.index govdoc-companies-000001 \
   --os.index-strategy static \
   --os.insecure \
   --os.batch-size 500 \
   --os.refresh
```

Docs: see `docs-site/docs/installation/OpenSearch.md` for end-to-end setup and query examples.

### 3. Manual Workflow

If you prefer to run each step separately, make sure to use `LOG_LEVEL=DEBUG` for detailed output when running the separate apps:

**Step 1: Search & Download**

```sh
npm start crawler
```

- Use the interactive CLI to search for companies or download documents by GEMI ID(s)
- Results are saved in `ids.txt` and downloaded files in `apps/crawler/src/downloads/{GEMI_ID}/`

**Step 2: Process Documents**

```sh
npm start scanner
```

- Place documents in `apps/doc-scanner/src/data/input/{GEMI_ID}/`
- Output is generated in `apps/doc-scanner/src/data/output/{GEMI_ID}/`

### Alternative Commands

You can also run commands directly:

- `npm run crawler` (same as `npm start crawler`)
- `npm run scanner` (same as `npm start scanner`)
- `npm run govdoc` (same as `npm start govdoc`)

## Command Summary

| What you want to do        | Command             |
| -------------------------- | ------------------- |
| **First time setup**       | `npm install`       |
| **Interactive workflow**   | `npm start govdoc`  |
| **Search & download only** | `npm start crawler` |
| **Process documents only** | `npm start scanner` |
| **Get help**               | `npm start help`    |

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

## Reasons for Offering & Problem Solved

Access to Greek public company data is hindered by the prevalence of unstructured PDF files. This project addresses the lack of transparency and the inefficiency in data utilization by converting these documents into structured, machine-readable formats with optional full-text search capabilities.

govdoc-scanner automates:

- Searching for companies with complex filters
- Downloading all available public documents
- Extracting and structuring metadata for analysis
- Building historical timelines for research or reporting
- Creating searchable indexes with OpenSearch for advanced analytics

This enables users to efficiently gather and analyze business data at scale, supporting transparency, due diligence, and investigative work.
