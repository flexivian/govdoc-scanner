---
sidebar_position: 1
---

# GSoC 2025 Project Overview: GovDoc Scanner

**Mentors**: Giannis E. Skitsas, Vasilis Christopoulos

**Assignee**: Eftihis Drakakis

## Abstract

The GovDoc Scanner project was undertaken to address the challenge of accessing and utilizing public company data from the Greek GEMI portal, which is often locked away in unstructured PDF and DOCX files. The project successfully developed a suite of tools to automate the process of fetching, processing, and structuring this data. The outcome is a powerful system that can crawl the GEMI portal, download relevant documents, extract metadata and content using generative AI, and organize the information into a structured, searchable format. This work significantly improves the transparency and accessibility of public corporate information in Greece.

## Main goals for GSoC 2025

The primary objectives for this project were:

- **Automated Document Crawling**: Develop a robust crawler to navigate the GEMI portal, search for companies using various filters, and download all associated public documents.
- **Intelligent Document Processing**: Create a document processing pipeline that can handle different file formats (PDF, DOCX, DOC), extract text, and use Google's Gemini AI to extract structured metadata and generate contextual summaries.
- **End-to-End Orchestration**: Build a top-level script to automate the entire workflow, from crawling and downloading to processing and storing the data, complete with progress tracking and error handling.
- **Comprehensive Documentation**: Establish a documentation site to provide clear instructions for installation, usage, and development, ensuring the project is accessible to a wide audience.

## Implementation

### Crawler Application

The crawler is a Node.js application responsible for interacting with the GEMI portal.

- **Web Scraping and Automation**: `Playwright` is used for browser automation, enabling the crawler to perform complex interactions like filling out forms and navigating through pages to find and download documents. `Cheerio` is used for parsing the HTML of the portal to extract links and other relevant information.
- **User Interface**: An interactive command-line interface (CLI) was built using `inquirer`, allowing users to easily specify which companies to search for or which GEMI IDs to download documents for.
- **HTTP Requests and Data Handling**: `axios` is used for making direct HTTP requests to download files, and `greek-utils` helps in handling Greek-specific text and character sets. `string-similarity` is used to find potential matches for company names.

### Document Scanner Application

The doc-scanner application processes the downloaded documents to extract valuable information.

- **AI-Powered Metadata Extraction**: The core of the scanner uses the `@google/generative-ai` package to communicate with the Google Gemini API. This allows for sophisticated analysis of the document text to extract metadata and generate contextual histories.
- **Document Text Extraction**: The application supports multiple document formats. `mammoth` is used to extract raw text from `.docx` files, and `word-extractor` handles older `.doc` files.
- **Asynchronous Processing**: To handle large numbers of documents efficiently, `p-limit` is used to control the concurrency of asynchronous operations, preventing the application from overwhelming the system or hitting API rate limits.
- **Environment Management**: The `dotenv` package is used to manage environment variables, keeping sensitive information like API keys out of the source code.

### Orchestrator Script

The orchestrator script ties the crawler and the doc-scanner together into a seamless workflow.

- **Workflow Automation**: This script automates the process of running the crawler to download documents and then passing them to the doc-scanner for processing.
- **Progress Tracking**: `cli-progress` is used to display a progress bar in the terminal, giving users real-time feedback on the status of the batch processing.

### Monorepo and Development

- **Nx Monorepo**: The entire project is managed as a monorepo using `Nx`. This simplifies the management of the different applications (`crawler`, `doc-scanner`) and shared scripts, and helps in enforcing consistent development practices.
- **Playwright**: `playwright` is also used for end-to-end testing of the applications.

## Repository

The repository for this project can be found [here](https://github.com/flexivian/govdoc-scanner).

## Quick Start

- **Development**: Setup the development environment as described in the [Development](../../installation/Development.md) guide.
- **Documentation**: The documentation site can be started by following the instructions in the [Production](../../installation/Production.md) guide.
