---
sidebar_position: 1
---

# What is GovDoc Scanner?

## Project Overview

### Problem Statement:

In Greece, vital public company data is often locked in unstructured PDF files, making it challenging for citizens,
researchers, and policymakers to access and analyze this information. The current state of these documents limits
transparency and hinders efficient data use. The Flexible GovDoc Scanner project seeks to bridge this gap by
transforming these PDFs into a structured, searchable database, thereby democratizing access to important corporate
information.

### What I am Making:

The Flexible GovDoc Scanner is an open-source tool designed to convert unstructured GEMI portal PDFs into a fully
searchable database accessible via a REST API. The solution comprises the following steps:

- **Fetch**: Systematically retrieve documents from Greece’s official Open Data Portal, ensuring full compliance
  with legal and ethical standards.
- **Extract**: Leverage Google Gemini's generative AI capabilities to accurately extract metadata and text from the documents, eliminating the need for traditional OCR.
- **Organize**: Index and store the extracted data in OpenSearch, taking advantage of its built-in language
  analyzers for Greek text and fast querying capabilities.
- **Share**: Develop a robust REST API that allows users to query the database by various parameters such as
  company name, incorporation date, and key individuals, with features like pagination, filtering, and rate
  limiting.

## Tools Used

- **Node.js**: The runtime environment for all scripts and applications.
- **NPM Workspaces**: Modern monorepo management for organizing multiple applications and shared dependencies.
- **Google Gemini**: Used for its generative AI capabilities in document processing and metadata extraction.
- **Unified CLI Tool**: Interactive and command-line interfaces for seamless workflow orchestration.

## Something Missing? {#something-missing}

If something is missing in the documentation or if you found some part confusing, please click on **edit this Page** and create a PR for improvement. We love your contribution!
