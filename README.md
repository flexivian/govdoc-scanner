# govdoc-scanner

## Project Overview

In Greece, vital public company data is often locked in behind multiple custom templated PDF files, making it challenging for citizens, researchers, and policymakers to access and analyze this information. The current state of these documents limits transparency and hinders efficient data use. The govdoc-scanner project seeks to bridge this gap by transforming these PDFs into a structured, searchable database, thereby democratizing access to important corporate information.

The govdoc-scanner is an open-source tool designed to convert unstructured [Γ.Ε.ΜΗ.](https://www.businessportal.gr/) (GEMI) portal PDFs into a fully searchable database accessible via a REST API. It automates the extraction of metadata and document histories, making corporate information more accessible and useful for a wide range of users.

## Current Functionality/Implementation

The repository currently includes three main applications:

- **doc-scanner**: Processes `.pdf`, `.doc` and `.docx` documents for a given GEMI company, extracting comprehensive metadata with chronological processing and intelligent representative tracking using Gemini 2.5 Flash.
- **crawler**: Scrapes the GEMI portal to search for companies using advanced filters and downloads all available public documents with enhanced date extraction and robust retry mechanisms.
- **cli**: A unified command-line interface that orchestrates the complete workflow, combining crawling and scanning with interactive prompts and automated batch processing.

All tools are implemented in Node.js and use a combination of CLI interfaces and automated scripts. The project uses npm workspaces for managing multiple applications.

## Usage Instructions

### Requirements

- **Node.js**: v18.x or newer (recommended: v20.x)
  Check your versions with:

```sh
node --version
```

- **.env file**: Copy the example environment file and update it with your Gemini API key:

```sh
cp .env.example .env
```

Then, open `.env` and set:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Quick Start

1. **Install Dependencies**
   ```sh
   npm install
   ```

2. **Run the Tool** (choose one of the following)

   **🚀 Most Common Usage - Interactive Workflow:**
   ```sh
   npm start govdoc
   ```
   This runs an interactive CLI that guides you through the complete workflow.

   **🔍 Just Search & Download Documents:**
   ```sh
   npm start crawler
   ```

   **📄 Just Process Existing Documents:**
   ```sh
   npm start scanner
   ```

   **❓ Get Help:**
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
- **VAT Search**: Search companies by VAT numbers (coming soon)
- **Random Selection**: Process random companies (coming soon)

### 2. Command Line Usage (for automation)

```sh
# Process from file
npm start govdoc -- --input ./companies.gds

# Search by VAT numbers (coming soon)
npm start govdoc -- --company-vat "123456789,987654321"

# Process random companies (coming soon)  
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

### 3. Manual Workflow

If you prefer to run each step separately:

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

| What you want to do | Command |
|---------------------|---------|
| **First time setup** | `npm install` |
| **Interactive workflow** | `npm start govdoc` |
| **Search & download only** | `npm start crawler` |
| **Process documents only** | `npm start scanner` |
| **Get help** | `npm start help` |

## Features Offered

- **Unified CLI Tool**: Complete end-to-end workflow with both interactive and command-line modes for different use cases and automation needs.
- **Automated Document Downloading**: Bulk or single download of all public documents for any Greek company listed in GEMI with enhanced date extraction for proper filename organization.
- **Advanced Company Search**: Filter by name, legal type, status, location, and more.
- **Intelligent Metadata Extraction**: Uses Gemini 2.5 Flash for accurate extraction of company information, representative details, and ownership data from Greek legal documents.
- **Chronological Processing**: Processes documents in date order to track company evolution and changes over time.
- **Representative Tracking**: Accurately identifies company representatives, their active status, and ownership percentages with advanced duplicate prevention.
- **Greek Legal Optimization**: Specialized for Greek corporate legal terminology and GEMI document structures.
- **Enhanced Reliability**: Robust retry mechanisms and improved error handling for stable operation.
- **Interactive CLI**: User-friendly command-line interfaces with guided prompts for all workflows.
- **Multiple Input Methods**: Support for file input, manual entry, VAT-based search, and random selection.
- **Progress Tracking**: Unified progress bar and summary for batch operations.

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

Access to Greek public company data is hindered by the prevalence of unstructured PDF files. This project addresses the lack of transparency and the inefficiency in data utilization by converting these documents into structured, machine-readable formats.
govdoc-scanner automates:

- Searching for companies with complex filters
- Downloading all available public documents
- Extracting and structuring metadata for analysis
- Building historical timelines for research or reporting

This enables users to efficiently gather and analyze business data at scale, supporting transparency, due diligence, and investigative work.
