---
sidebar_position: 1
---

# GSoC 2025 Project: GovDoc Scanner

**Mentors**: Giannis E. Skitsas, Vasilis Christopoulos

**Assignee**: Eftihis Drakakis

## Abstract

GovDoc Scanner transforms unstructured Greek GEMI portal documents (PDF/DOC/DOCX) into structured, searchable data. The project delivers an integrated suite of tools that crawl and download documents, process them using Google Gemini 2.5 Flash Lite AI, and produce chronologically-tracked metadata with comprehensive representative information. This democratizes access to Greek corporate transparency data through automated workflows and REST API access.

## Project Objectives

**Core Goals Achieved:**

- **Automated Document Crawling**: Robust [`Playwright`](apps/crawler/src/ui.mjs:1)-powered crawler with advanced company search filters, intelligent date extraction, and organized document downloads
- **AI-Powered Document Processing**: Advanced pipeline using [`Google Gemini 2.5 Flash Lite`](apps/doc-scanner/src/gemini-config.mjs:1) for metadata extraction, chronological processing, and Greek legal document analysis
- **Unified CLI Orchestration**: Complete [`command-line interface`](apps/cli/src/main.mjs:1) with interactive prompts, batch processing, progress tracking, and comprehensive error handling
- **Production Infrastructure**: [`OpenSearch integration`](apps/opensearch/README.md:1) with [`REST API server`](apps/api/README.md:1) for scalable data access and search capabilities
- **Comprehensive Documentation**: [`Docusaurus-powered documentation site`](docs-site/README.md:1) with installation guides, code examples, and development instructions

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

## Technical Implementation

### Architecture Overview

The project follows a **monorepo structure** with `NPM workspaces` managing five core applications:

**Core Applications:**

- **crawler**: Playwright-powered GEMI portal automation with intelligent date extraction and document organization
- **doc-scanner**: AI-powered document processing using Gemini 2.5 Flash Lite with specialized Greek legal prompts
- **cli**: Unified orchestration tool with interactive and batch processing modes
- **api**: Fastify-based REST API with authentication and rate limiting
- **opensearch**: Production-ready search infrastructure with security and monitoring

### Key Technical Features

**Document Processing Pipeline:**

- **Chronological Processing**: Documents sorted by extracted dates for accurate company evolution tracking
- **Representative Identification**: Advanced AI prompts for Greek corporate roles and ownership analysis
- **Change Tracking**: Automated detection of structural and economic changes between document versions
- **Multi-format Support**: PDF, DOC, DOCX processing with mammoth and word-extractor

**Infrastructure & Reliability:**

- **Shared Infrastructure**: Centralized configuration, logging, progress management, and error handling
- **Progress-Aware Logging**: Automatic log buffering during operations with clean terminal output
- **Structured Error Handling**: Custom error classes for consistent error management
- **Configuration Validation**: Environment validation with API key connectivity testing

**Data Organization:**

- **Working Directory Structure**: Organized under `~/.govdoc/` with app-specific subdirectories
- **Metadata Schema**: Comprehensive company information with representative tracking and financial data
- **OpenSearch Integration**: Full-text search with Greek language analyzers and production security

## Future Development Roadmap

**Planned Enhancements:**

### Production Infrastructure

- **Cloud Deployment Strategy**: Scalable cloud architecture with cost optimization and monitoring
- **Administrative Backoffice**: User management, API throttling, access control, and system health dashboards
- **Automated Crawling**: Scheduled crawling operations with administrative control and progress monitoring

### Advanced AI Integration

- **Model Context Protocol (MCP) Server**: Enhanced AI capabilities with model switching and optimization
- **Advanced Analytics**: Pattern recognition and trend analysis across corporate data

### Community & Documentation

- **Technical Articles**: Medium articles and social media content showcasing project capabilities
- **Enhanced Documentation**: Comprehensive guides, API references, and contribution guidelines

All development is tracked on [GitHub Issues](https://github.com/flexivian/govdoc-scanner/issues) with community contributions welcome.

## Getting Started

**Quick Links:**

- **[Complete Documentation](https://flexivian.github.io/govdoc-scanner/)** - Comprehensive guides and API references
- **[Getting Started Guide](../../installation/Getting%20Started.md)** - Basic usage and setup instructions
- **[Development Setup](../../installation/Development.md)** - Environment configuration for contributors
- **[OpenSearch Integration](../../installation/OpenSearch.md)** - Search infrastructure setup
- **[REST API Guide](../../installation/REST-API.md)** - API server deployment and usage

**Repository:** [github.com/flexivian/govdoc-scanner](https://github.com/flexivian/govdoc-scanner)
