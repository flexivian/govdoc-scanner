---
sidebar_position: 1
---

# Getting Started

This page provides instructions for setting up and running the GovDoc Scanner project.

## Prerequisites

- **Node.js**: v18.x or newer (recommended: v20.x)
- **Git**: For cloning the repository
- **Gemini API Key**: Required for AI-powered document processing ([Get one here](https://aistudio.google.com/app/apikey))

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/flexivian/govdoc-scanner.git
cd govdoc-scanner
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. First Run

Test with the interactive CLI (recommended):

```bash
npm start govdoc
# Follow the interactive prompts to:
# - Choose input method (file, manual, or random)
# - Process companies with automated workflow
# - View progress and results
```

## Project Applications

The project includes three main applications:

- **CLI Tool**: Complete end-to-end interactive workflow (recommended)
- **Crawler**: Search and download documents from GEMI portal with enhanced date extraction
- **Doc-Scanner**: Process documents with AI-powered chronological analysis and representative tracking

## Individual Application Usage

### CLI Tool (Recommended)

```bash
npm start govdoc
# Interactive mode with guided prompts:
# - File input, manual entry, or random selection
# - Automated crawling and document processing
# - Progress tracking and comprehensive summaries
# - Output saved to project root ./output/
```

**Command line mode for automation:**

```bash
# Process from file
npm start govdoc -- --input ./companies.gds

# Process random companies
npm start govdoc -- --company-random 10

# Show help
npm start govdoc -- --help
```

### Crawler

```bash
npm start crawler
# Search for companies or download by GEMI ID
# Results saved to apps/crawler/src/downloads/
```

### Doc-Scanner

```bash
npm start scanner
# Process documents from input directory
# Requires manual document placement in apps/doc-scanner/src/data/input/
# Important: Name files with date prefixes (YYYY-MM-DD) for chronological processing
# Generates comprehensive metadata with representative tracking
```

## Output Structure

After processing, find results in:

```
output/
├── 123204604000/
│   ├── 123204604000_final_metadata.json  # Comprehensive company metadata
│   └── document_downloads/
│       └── *.pdf, *.docx files
└── govdoc-output.json  # Summary
```

## Next Steps

- Check [Development Setup](./Development.md) for advanced configuration
- Explore [Code Examples](../code-examples/overview.md) for usage patterns
- Review [GSoC 2025 Overview](../gsoc/2025/overview.md) for project background

## Troubleshooting

- **API Key Issues**: Ensure valid Gemini API key in `.env` file
- **Browser Issues**: Run `npx playwright install chromium`
- **Permissions**: Check write access to output directories
