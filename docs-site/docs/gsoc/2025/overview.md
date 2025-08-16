---
sidebar_position: 1
---

# GSoC 2025 Project Overview: GovDoc Scanner

**Mentors**: Giannis E. Skitsas, Vasilis Christopoulos

**Assignee**: Eftihis Drakakis

## Abstract

The GovDoc Scanner project was undertaken to address the challenge of accessing and utilizing public company data from the Greek GEMI portal, which is often locked away in unstructured PDF and DOCX files. The project successfully developed a sophisticated suite of tools to automate the process of fetching, processing, and structuring this data with advanced AI capabilities. The outcome is a powerful system that can crawl the GEMI portal, download relevant documents with proper date organization, extract comprehensive metadata using state-of-the-art AI models, and organize the information into structured, searchable formats with chronological tracking. This work significantly improves the transparency and accessibility of public corporate information in Greece.

## Main goals for GSoC 2025

The primary objectives for this project were:

- **Automated Document Crawling**: Develop a robust crawler to navigate the GEMI portal, search for companies using various filters, and download all associated public documents with enhanced date extraction for proper organization.
- **Intelligent Document Processing**: Create an advanced document processing pipeline that can handle different file formats (PDF, DOCX, DOC), extract text, and use Google's Gemini 2.5 Flash to extract comprehensive structured metadata with chronological processing and representative tracking.
- **End-to-End CLI Tool**: Build a unified command-line interface to orchestrate the entire workflow, from crawling and downloading to processing and storing the data, complete with interactive prompts, automated batch processing, progress tracking and error handling.
- **Comprehensive Documentation**: Establish a documentation site to provide clear instructions for installation, usage, and development, ensuring the project is accessible to a wide audience.

## Implementation

### Crawler Application

The crawler is a Node.js application responsible for interacting with the GEMI portal.

- **Web Scraping and Automation**: `Playwright` is used for browser automation, enabling the crawler to perform complex interactions like filling out forms and navigating through pages to find and download documents. `Cheerio` is used for parsing the HTML of the portal to extract links and other relevant information.
- **Enhanced Date Extraction**: Advanced logic extracts dates from table rows and prepends them to filenames for proper chronological organization.
- **User Interface**: An interactive command-line interface (CLI) was built using `inquirer`, allowing users to easily specify which companies to search for or which GEMI IDs to download documents for.
- **Robust Download System**: `axios` is used for making direct HTTP requests with enhanced reliability through retry mechanisms and improved file extension detection. `greek-utils` helps in handling Greek-specific text and character sets. `string-similarity` is used to find potential matches for company names.

### Document Scanner Application

The doc-scanner application processes the downloaded documents to extract valuable information using advanced AI capabilities.

- **Advanced AI-Powered Analysis**: The core of the scanner uses the `@google/generative-ai` package to communicate with Google's Gemini 2.5 Flash model, enabling sophisticated analysis of Greek legal documents with specialized prompts for representative identification and Greek corporate terminology.
- **Chronological Processing**: Documents are automatically sorted by date based on filename prefixes, ensuring proper chronological processing to track company evolution over time.
- **Intelligent Metadata Schema**: Expanded schema includes comprehensive company information, detailed representative data (active status, tax IDs, capital shares), and refined field descriptions with duplicate prevention logic.
- **Modular Prompt Architecture**: Specialized prompts are extracted into a dedicated prompts.mjs file, implementing advanced instructions for Greek legal terminology, representative identification, and ownership analysis.
- **Document Text Extraction**: The application supports multiple document formats. `mammoth` is used to extract raw text from `.docx` files, and `word-extractor` handles older `.doc` files.
- **Unified Processing Logic**: Replaced individual file processing with a streamlined processCompanyFiles function that generates a single comprehensive metadata file containing all extracted information merged chronologically.
- **Environment Management**: The `dotenv` package is used to manage environment variables, keeping sensitive information like API keys out of the source code.

### CLI Tool Application

The CLI tool serves as a unified interface that orchestrates the complete workflow, combining both crawler and doc-scanner functionality.

- **Interactive Mode**: User-friendly prompts guide users through different input methods (file input, manual GEMI ID entry, or random selection with date-based search filters) with step-by-step workflow automation.
- **Command-Line Mode**: Non-interactive automation support for batch processing and CI/CD integration with comprehensive argument parsing and error handling.
- **Workflow Orchestration**: Seamlessly coordinates the crawler and doc-scanner applications, handling file transfer between components and maintaining processing state.
- **Progress Tracking**: Real-time progress bars and comprehensive summaries using `cli-progress` to provide users with detailed feedback on batch processing operations.
- **Error Handling**: Robust error management with graceful failure recovery and detailed logging for troubleshooting processing issues.

### Monorepo and Development

- **NPM Workspaces**: The entire project is managed as a monorepo using NPM workspaces. This simplifies the management of the different applications (`crawler`, `doc-scanner`, `cli`) and shared dependencies, enabling consistent development practices across all components.
- **Playwright**: `playwright` is also used for end-to-end testing of the applications.

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

- **#12 - Implement Track Changes Feature for Company Incorporation Data**
  - Monitor changes in company status and information
  - Generate alerts for significant corporate events
  - Maintain historical change logs

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
