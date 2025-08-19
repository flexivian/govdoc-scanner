---
sidebar_position: 1
---

# GSoC 2025 Project Overview: GovDoc Scanner

**Mentors**: Giannis E. Skitsas, Vasilis Christopoulos

**Assignee**: Eftihis Drakakis

## Abstract

The GovDoc Scanner project tackles the challenge of accessing and using public company data from the Greek GEMI portal, where information is typically locked in unstructured PDF/DOC/DOCX files. The project delivers a suite of tools that: crawl and download documents, process them using AI (Gemini Flash), and produce structured, searchable metadata with chronological tracking. Outputs are organized per company and consolidated for batch runs, improving transparency and accessibility of public corporate information in Greece.

## Main goals for GSoC 2025

The primary objectives for this project were:

- **Automated Document Crawling**: Develop a robust crawler to navigate the GEMI portal, search for companies using various filters, and download all associated public documents with enhanced date extraction for proper organization.
- **Intelligent Document Processing**: Create an advanced document processing pipeline that can handle different file formats (PDF, DOCX, DOC), extract text, and use Google's Gemini 2.5 Flash Lite to extract comprehensive structured metadata with chronological processing and representative tracking.
- **End-to-End CLI Tool**: Build a unified command-line interface to orchestrate the entire workflow, from crawling and downloading to processing and storing the data, complete with interactive prompts, automated batch processing, progress tracking and error handling.
- **Comprehensive Documentation**: Establish a documentation site to provide clear instructions for installation, usage, and development, ensuring the project is accessible to a wide audience.

## Development Progress Through Pull Requests

The project was developed through a series of iterative pull requests, each adding significant functionality and improvements:

### Core Infrastructure & Setup (PRs #3, #6, #7, #8)

- **[PR #3](https://github.com/flexivian/govdoc-scanner/pull/3)**: Implementation of a batch document processing pipeline for metadata extraction and contextual history generation using Gemini
- **[PR #6](https://github.com/flexivian/govdoc-scanner/pull/6)**: Pipeline for company search and document download
- **[PR #7](https://github.com/flexivian/govdoc-scanner/pull/7)**: Orchestration script for crawling and pdf scanning
- **[PR #8](https://github.com/flexivian/govdoc-scanner/pull/8)**: Updated README and Nx structure - moved .env file to root
- **[PR #26](https://github.com/flexivian/govdoc-scanner/pull/26)**: App updates - Enhanced functionality across all applications
- **[PR #27](https://github.com/flexivian/govdoc-scanner/pull/27)**: CLI Tool - Removal of NX - Streamlined the CLI tool and removed NX dependency for better maintainability

### Documentation & Project Management (PRs #9, #10, #35)

- **[PR #9](https://github.com/flexivian/govdoc-scanner/pull/9)**: Docusaurus Setup - Established comprehensive documentation infrastructure
- **[PR #10](https://github.com/flexivian/govdoc-scanner/pull/10)**: GitHub Pages deployment for documentation - Made documentation publicly accessible
- **[PR #35](https://github.com/flexivian/govdoc-scanner/pull/35)**: Docs Updates - Comprehensive documentation updates and improvements

### UI/UX & Visual Improvements (PR #29)

- **[PR #29](https://github.com/flexivian/govdoc-scanner/pull/29)**: Logo and homepage images - Added branding and visual elements to improve user experience

### Advanced Features & Bug Fixes (PRs #30, #31)

- **[PR #30](https://github.com/flexivian/govdoc-scanner/pull/30)**: Tracked changes feature - Implemented change tracking capabilities for better workflow management
- **[PR #31](https://github.com/flexivian/govdoc-scanner/pull/31)**: Handle fenced JSON responses and enforce raw JSON output - Fixed JSON parsing issues and improved data consistency

### Infrastructure & Error Handling (PRs #32, #33, #34)

- **[PR #32](https://github.com/flexivian/govdoc-scanner/pull/32)**: Structured Errors, API Key Validation & UX Cleanup - Implemented comprehensive error handling and improved user experience
- **[PR #33](https://github.com/flexivian/govdoc-scanner/pull/33)**: Config Management - Added centralized configuration management system
- **[PR #34](https://github.com/flexivian/govdoc-scanner/pull/34)**: Unified Error Handling & Logging System - Advanced error handling and logging infrastructure

## Implementation

### Crawler Application

The crawler is a Node.js application responsible for interacting with the GEMI portal.

- **Web Scraping and Automation**: `Playwright` powers browser automation (forms, navigation, downloads). `Cheerio` parses portal HTML to extract links and relevant information.
- **Enhanced Date Extraction**: Advanced logic extracts dates from table rows and prepends them to filenames for proper chronological organization.
- **User Interface**: An interactive command-line interface (CLI) was built using `inquirer`, allowing users to easily specify which companies to search for or which GEMI IDs to download documents for.
- **Robust Download System**: `axios` handles HTTP downloads with retries and improved file extension detection. `greek-utils` assists with Greek-specific text; `string-similarity` suggests potential company-name matches.
- **Outputs**: Search results are saved to `apps/crawler/src/ids.txt`. Downloads are organized under `apps/crawler/src/downloads/{GEMI_ID}/document_downloads/` with date-prefixed filenames.

### Document Scanner Application

The doc-scanner application processes the downloaded documents to extract valuable information using advanced AI capabilities.

- **Advanced AI-Powered Analysis**: The scanner uses `@google/generative-ai` with Google's Gemini 2.5 Flash Lite, enabling specialized analysis of Greek legal documents with prompts for representative identification and Greek corporate terminology.
- **Chronological Processing**: Documents are automatically sorted by date based on filename prefixes, ensuring proper chronological processing to track company evolution over time.
- **Intelligent Metadata Schema**: Expanded schema includes comprehensive company information, detailed representative data (active status, tax IDs, capital shares), and refined field descriptions with duplicate prevention logic.
- **Modular Prompt Architecture**: Specialized prompts are extracted into a dedicated prompts.mjs file, implementing advanced instructions for Greek legal terminology, representative identification, and ownership analysis.
- **Document Text Extraction**: The application supports multiple document formats. `mammoth` is used to extract raw text from `.docx` files, and `word-extractor` handles older `.doc` files.
- **Unified Processing Logic**: A streamlined `processCompanyFiles(files, inputFolder, outputFolder, gemiId, model)` function generates a single comprehensive metadata file, merged chronologically. Incremental logic skips processing when no new files are detected.
- **Environment Management**: The `dotenv` package is used to manage environment variables, keeping sensitive information like API keys out of the source code.
- **Outputs**: When used directly, results are written to `apps/doc-scanner/src/data/output/{GEMI_ID}/{GEMI_ID}_final_metadata.json`.

### CLI Tool Application

The CLI tool serves as a unified interface that orchestrates the complete workflow, combining both crawler and doc-scanner functionality.

- **Interactive Mode**: User-friendly prompts guide users through input methods (file input, manual GEMI ID entry, or random selection) with step-by-step workflow automation.
- **Command-Line Mode**: Non-interactive automation support for batch processing and CI/CD integration with comprehensive argument parsing and error handling.
- **Workflow Orchestration**: Seamlessly coordinates the crawler and doc-scanner applications, handling file transfer between components and maintaining processing state.
- **Progress Tracking**: Real-time progress bars and comprehensive summaries with integrated logging system.
- **Advanced Infrastructure**:
  - Integrated configuration validation and API key verification
  - Structured error handling with detailed logging and graceful failure recovery
  - Centralized logging system with progress-aware buffering
- **Usage**: Pass arguments using npm’s "--" separator, for example: `npm start govdoc -- --input ./companies.gds`.
- **Outputs**: Batch outputs are saved under `./output/{GEMI_ID}/` with `{GEMI_ID}_final_metadata.json` and downloaded documents, plus a consolidated `./output/govdoc-output.json` summary.

### Shared Infrastructure & Monorepo

- **NPM Workspaces**: The entire project is managed as a monorepo using NPM workspaces. This simplifies the management of the different applications (`crawler`, `doc-scanner`, `cli`) and shared dependencies, enabling consistent development practices across all components.
- **Shared Modules**: Common infrastructure is centralized under `shared/` including:
  - **Configuration Management**: Centralized environment-aware configuration loading and validation
  - **Logging System**: Module-specific loggers with automatic progress-aware buffering
  - **Progress Management**: Real-time progress bars with integrated log buffering
  - **Error Handling**: Structured error classes for consistent error management across applications
- **Browser Automation**: `playwright` is used for browser automation within the crawler.
- **Development Tools**: Unified error handling, logging, and progress tracking across all applications.

## Future Roadmap & TODOs

The following enhancements are planned for the GovDoc Scanner project as part of ongoing development:

### Infrastructure & Deployment

- **#18 - Identify Cloud Hosting Strategy and Provide Target Architecture Diagram**
  - Design scalable cloud infrastructure for production deployment
  - Create architectural diagrams for system components
  - Define hosting requirements and cost estimates

### Backend Development

- **#13 - Store Company Metadata Output in OpenSearch Database**
  - Implement OpenSearch integration for structured data storage
  - Design efficient indexing strategies for company metadata
  - Enable full-text search capabilities across company data

- **#14 - Implement REST API Server for Company Metadata Querying and Access Management**
  - Build RESTful API endpoints for data access
  - Implement authentication and authorization
  - Create rate limiting and usage monitoring

- **#15 - Implement Backoffice for User, Throttling, Whitelist, and IP Management**
  - Develop administrative interface for user management
  - Create tools for API throttling and access control
  - Build monitoring dashboards for system health

### Advanced Features

- **#16 - Implement Crawling Feature for Admin from Backoffice**
  - Enable administrative control of crawling operations
  - Schedule automated crawling tasks
  - Provide crawling status and progress monitoring

- **#17 - Implement MCP Server and Showcase**
  - Develop Model Context Protocol (MCP) server integration
  - Create showcases demonstrating advanced AI capabilities
  - Enable seamless AI model switching and optimization

### Documentation & Outreach

- **#21 - Finalize Documentation, GSoC Delivery URL/Page, and README**
  - Complete comprehensive project documentation
  - Create project delivery pages and demos
  - Update README with latest features and usage instructions

- **#20 - Make Social Buzz (Medium Article, LinkedIn Post, FB Post)**
  - Write technical articles about the project
  - Create social media content for project promotion
  - Share project achievements and use cases

All issues are tracked on GitHub and contributions are welcome from the community.

## Repository

The repository for this project can be found [here](https://github.com/flexivian/govdoc-scanner).

## Quick Start

- **Development**: Setup the development environment as described in the [Development](../../installation/Development.md) guide.
- **Getting Started**: Basic usage instructions are available in the [Getting Started](../../installation/Getting%20Started.md) guide.
