# govdoc-scanner

## Project Overview

In Greece, vital public company data is often locked in behind multiple custom templated PDF files, making it challenging for citizens, researchers, and policymakers to access and analyze this information. The current state of these documents limits transparency and hinders efficient data use. The govdoc-scanner project seeks to bridge this gap by transforming these PDFs into a structured, searchable database, thereby democratizing access to important corporate information.

The govdoc-scanner is an open-source tool designed to convert unstructured [Γ.Ε.ΜΗ.](https://www.businessportal.gr/) (GEMI) portal PDFs into a fully searchable database accessible via a REST API. It automates the extraction of metadata and document histories, making corporate information more accessible and useful for a wide range of users.

## Current Functionality/Implementation

The repository currently includes three main applications:

- **doc-scanner**: Processes `.pdf`, `.doc` and `.docx` documents for a given GEMI company, extracting comprehensive metadata with chronological processing and intelligent representative tracking using Gemini 2.5 Flash.
- **crawler**: Scrapes the GEMI portal to search for companies using advanced filters and downloads all available public documents with enhanced date extraction and robust retry mechanisms.
- **orchestrator**: A script that automates the workflow of crawling and scanning for multiple GEMI IDs with progress tracking.

All tools are implemented in Node.js and use a combination of CLI interfaces and automated scripts. The project uses [Nx](https://nx.dev/) for monorepo management.

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

### 1. Install Dependencies

From the project root:

```sh
npm install
```

### 2. Running the Crawler

To search for companies or download documents:

```sh
npx nx run crawler:start
```

- Use the interactive CLI to search for companies or download documents by GEMI ID(s).
- Results are saved in `ids.txt` and downloaded files in `apps/crawler/src/downloads/{GEMI_ID}/`.

### 3. Running the Doc-Scanner

To process documents and extract metadata:

```sh
npx nx run doc-scanner:start
```

- Place documents in `apps/doc-scanner/src/data/input/{GEMI_ID}/`.
- **Important**: Name files with date prefixes (YYYY-MM-DD) for chronological processing.
- Output generates a single comprehensive metadata file `{GEMI_ID}_final_metadata.json` in `apps/doc-scanner/src/data/output/{GEMI_ID}/`.

### 4. Orchestrated Workflow

To automate crawling and scanning for multiple IDs:

```sh
npx nx run orchestrator:start
```

- Follows prompts to select IDs (single or from file).
- Downloads and processes documents, showing progress and summary.
- Output is saved in the `output/` directory at the project root.

## Features Offered

- **Automated Document Downloading**: Bulk or single download of all public documents for any Greek company listed in GEMI with enhanced date extraction for proper filename organization.
- **Advanced Company Search**: Filter by name, legal type, status, location, and more.
- **Intelligent Metadata Extraction**: Uses Gemini 2.5 Flash for accurate extraction of company information, representative details, and ownership data from Greek legal documents.
- **Chronological Processing**: Processes documents in date order to track company evolution and changes over time.
- **Representative Tracking**: Accurately identifies company representatives, their active status, and ownership percentages with advanced duplicate prevention.
- **Greek Legal Optimization**: Specialized for Greek corporate legal terminology and GEMI document structures.
- **Enhanced Reliability**: Robust retry mechanisms and improved error handling for stable operation.
- **Interactive CLI**: User-friendly command-line interfaces for all major workflows.
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
