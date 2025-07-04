---
sidebar_position: 1
---

# What is GovDoc Scanner?

GovDoc Scanner is an open-source tool for transforming unstructured Greek GEMI portal PDFs into a structured, searchable database. It automates the extraction of metadata and document histories, making corporate information more accessible and useful for a wide range of users.

## Getting Started

Get started by **cloning the GovDoc Scanner repository** and following the installation instructions.

### What you'll need

- [Node.js](https://nodejs.org/en/download/) version 18.0 or above
- A Gemini API key (for document processing)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-org/govdoc-scanner.git
cd govdoc-scanner
npm install
```

## Start the Documentation Site

From the `docs-site` directory, run:

```bash
npm install
npm run start
```

This will launch the GovDoc Scanner documentation at http://localhost:3000/.

Open `docs/intro.md` (this page) and edit some lines: the site **reloads automatically** and displays your changes.
