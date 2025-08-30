---
sidebar_position: 1
---

# GSoC 2025 Project: GovDoc Scanner

**Mentors**: Giannis E. Skitsas, Vasilis Christopoulos

**Assignee**: Eftihis Drakakis

## The Problem

In Greece, essential public company data exists in thousands of unstructured documents across the [Γ.Ε.ΜΗ. (GEMI)](https://publicity.businessportal.gr) portal. This creates significant barriers for:

- **Citizens** seeking transparency in corporate activities
- **Researchers** analyzing business trends and economic patterns
- **Policymakers** requiring data-driven insights for legislation
- **Journalists** investigating corporate structures and ownership

The current format limits transparency and makes systematic analysis nearly impossible.

## The Solution

**GovDoc Scanner** is an open-source tool designed to convert unstructured GEMI portal PDFs into a fully searchable database accessible via a REST API. The GSoC 2025 project successfully delivered a complete implementation that automates the entire document processing pipeline with **AI-powered extraction** and **production-ready infrastructure**.

### Core Components Delivered

- **Automated Document Crawling**: Robust `Playwright` powered crawler with advanced company search filters, intelligent date extraction, and organized document downloads from the GEMI portal
- **AI-Powered Document Processing**: Advanced pipeline using `Google Gemini 2.5 Flash Lite` for metadata extraction, chronological processing, and specialized Greek legal document analysis
- **Unified CLI Orchestration**: Complete `command-line interface` with interactive prompts, batch processing, progress tracking, and comprehensive error handling that combines all workflow components
- **Production Infrastructure**: Full `OpenSearch integration` with production-ready `REST API server` featuring authentication, rate limiting, and comprehensive Swagger documentation for scalable data access
- **Comprehensive Documentation**: Complete `Docusaurus-powered documentation site` with installation guides, code examples, development instructions, and API references

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
- **[PR #44](https://github.com/flexivian/govdoc-scanner/pull/44)**: Metadata enhancements - Enhanced metadata extraction with separate tracking for company changes and economic changes, new fields for financial data, and improved representative ownership tracking with capital amounts and percentages

### Infrastructure & Error Handling (PRs #32, #33, #34)

- **[PR #32](https://github.com/flexivian/govdoc-scanner/pull/32)**: Structured Errors, API Key Validation & UX Cleanup - Implemented comprehensive error handling and improved user experience
- **[PR #33](https://github.com/flexivian/govdoc-scanner/pull/33)**: Config Management - Added centralized configuration management system
- **[PR #34](https://github.com/flexivian/govdoc-scanner/pull/34)**: Unified Error Handling & Logging System - Advanced error handling and logging infrastructure
- **[PR #45](https://github.com/flexivian/govdoc-scanner/pull/45)**: Structural Refactor - Project restructuring with migration of core applications to `apps/` directory and introduction of configurable `WORKING_DIR` environment variable for unified output management

### Production Infrastructure & REST API (PRs #41, #43)

- **[PR #41](https://github.com/flexivian/govdoc-scanner/pull/41)**: Production OpenSearch Setup - Complete production-ready OpenSearch deployment with security, monitoring, and backup features including one-command setup, SSL certificates, user management, and health monitoring
- **[PR #43](https://github.com/flexivian/govdoc-scanner/pull/43)**: Rest API Setup - Production-ready REST API service with Fastify server, OpenSearch integration, Swagger documentation, authentication, rate limiting, and containerized deployment

## Technical Implementation

### Architecture Overview

The project follows a **monorepo structure** with `NPM workspaces` managing five specialized applications under the `apps/` directory, supported by shared infrastructure libraries:

**Application Structure:**

```
apps/
├── crawler/          # Playwright automation for GEMI portal
├── doc-scanner/      # AI document processing pipeline
├── cli/              # Unified command-line interface
├── api/              # Fastify REST API server
└── opensearch/       # Search infrastructure setup
```

### Technical Innovation

**AI-Powered Greek Legal Processing:**

- Custom prompts engineered for Greek corporate document structures (ΦΕΚ, ΓΕΜΗ formats)
- Chronological document sorting with intelligent date extraction from multiple formats
- Representative role identification using Greek legal terminology and ownership patterns
- Change detection comparing document versions for company evolution tracking

**Production-Ready Infrastructure:**

- **Zero-downtime deployment**: Opensearch and REST API docker containerization with health checks and graceful shutdowns
- **Security first**: OpenSearch with TLS encryption, RBAC user management, and dedicated service accounts
- **Scalable data pipeline**: Batch processing with configurable chunk sizes and retry mechanisms
- **Monitoring & observability**: Health check endpoints, backup automation, and cluster monitoring

## Future Development Roadmap

### Planned Enhancements:

## Production Infrastructure

- **Cloud Deployment Strategy**: Scalable cloud architecture with cost optimization and monitoring
- **Administrative Backoffice**: User management, API throttling, access control, and system health dashboards
- **Automated Crawling**: Scheduled crawling operations with administrative control and progress monitoring

## Advanced AI Integration

- **Model Context Protocol (MCP) Server**: Enhanced AI capabilities with model switching and optimization
- **Advanced Analytics**: Pattern recognition and trend analysis across corporate data

All development is tracked on [GitHub Issues](https://github.com/flexivian/govdoc-scanner/issues) with community contributions welcome.

## Getting Started

**Quick Links:**

- **[Complete Documentation](https://flexivian.github.io/govdoc-scanner/)** - Comprehensive guides and API references
- **[Getting Started Guide](../../installation/Getting%20Started.md)** - Basic usage and setup instructions
- **[Development Setup](../../installation/Development.md)** - Environment configuration for contributors

**Repository:** [github.com/flexivian/govdoc-scanner](https://github.com/flexivian/govdoc-scanner)
