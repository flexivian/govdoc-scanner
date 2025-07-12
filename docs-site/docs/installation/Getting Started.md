---
sidebar_position: 1
---

# Getting Started

This page provides instructions for setting up and running the GovDoc Scanner project.

## Requirements

- **Node.js**: v18.x or newer (recommended: v20.x)
  Check your version with:

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

## Installation

Clone the repository and install the necessary dependencies from the project root:

```bash
git clone https://github.com/flexivian/govdoc-scanner.git
cd govdoc-scanner
npm install
```

## Running the Applications

The project is managed as a monorepo using Nx. After running `npm install` in the root directory, you can run any of the applications using the commands below. Use the following commands to run the different applications from the project root.

### Crawler

To search for companies and download their documents, run the crawler:

```bash
npx nx run crawler:start
```

Follow the interactive prompts to specify GEMI IDs or search for companies.

### Doc-Scanner

To process downloaded documents and extract metadata, run the doc-scanner:

```bash
npx nx run doc-scanner:start
```

Make sure the documents to be processed are in the `apps/doc-scanner/src/data/input/{GEMI_ID}/` directory.

### Orchestrator

To run the end-to-end workflow of crawling and scanning for multiple companies, use the orchestrator script:

```bash
npx nx run orchestrator:start
```

- Follow prompts to select IDs (single or from file).
- Downloads and processes documents, showing progress and summary.
- Output is saved in the `output/` directory at the project root.
