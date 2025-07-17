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

Test with the orchestrator (recommended):

```bash
npx nx run orchestrator:start
# Select: 1) Single ID
# Enter GEMI ID: 123204604000
# Watch the automated process
```

## Project Applications

The project includes three main applications:

- **Orchestrator**: Complete end-to-end workflow (recommended)
- **Crawler**: Search and download documents from GEMI portal
- **Doc-Scanner**: Process documents and extract metadata

## Individual Application Usage

### Orchestrator (Recommended)

```bash
npx nx run orchestrator:start
# Combines crawler + doc-scanner automatically
# Shows progress bars and summaries
# Output saved to project root ./output/
```

### Crawler

```bash
npx nx run crawler:start
# Search for companies or download by GEMI ID
# Results saved to apps/crawler/src/downloads/
```

### Doc-Scanner

```bash
npx nx run doc-scanner:start
# Process documents from input directory
# Requires manual document placement in apps/doc-scanner/src/data/input/
```

## Output Structure

After processing, find results in:

```
output/
├── 123204604000/
│   ├── 123204604000_final_metadata.json
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
